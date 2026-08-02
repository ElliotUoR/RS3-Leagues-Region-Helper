-- An alternate edit-access route for user-submitted builds: an author-chosen
-- password, for when the browser/device holding the edit token (see
-- 012_user_builds.sql) is no longer available - a different computer, a
-- cleared profile, etc. There are still no accounts; this is a second
-- credential for the same tokenless model, not a login system.
--
-- Every build now gets a password AT CREATION TIME (see
-- src/pages/CreateBuildPage.jsx's publish-confirmation flow) - either one the
-- author actually chose, or (if they ticked "I don't want to set a
-- password") their own edit token used as the password verbatim. Either way
-- `edit_password_hash` ends up populated for every build going forward, so
-- "no password set" only happens for builds published before this migration
-- shipped.
--
-- Real bcrypt, not a bare sha256 (the algorithm edit_token_hash uses) -
-- edit_token_hash is fine unsalted/fast-hashed because the input is already a
-- random 24-byte token with no guessable structure, but a PASSWORD is
-- user-chosen and potentially weak, so it needs a slow, salted algorithm to
-- resist an offline dictionary attack if this table is ever exfiltrated.
-- `edit_password_hash` stores a complete bcrypt hash string (algorithm, cost
-- and salt all self-contained, exactly like ADMIN_PASSWORD_HASH already
-- works in server/src/routes/admin.js) - created in Node via `bcryptjs`
-- (see server/src/routes/userBuilds.js), never computed in SQL.
--
-- Verifying it, however, DOES happen in SQL, via pgcrypto's crypt() - not by
-- fetching the hash out to Node and comparing there. bcryptjs and pgcrypto
-- both implement the same standard bcrypt format, so a hash either one
-- produces is verifiable by the other. This matters for the same reason
-- update_user_build() compares edit_token_hash in its own WHERE clause
-- instead of trusting a caller's prior check: login_user_build() below is
-- granted to `anon` and PostgREST is directly reachable, not just through
-- Node (see src/utils/api.js's comments on that) - so the comparison has to
-- be the thing that actually gates the UPDATE, not a step that happened
-- somewhere else first and might not have.
create extension if not exists pgcrypto with schema public;

alter table public.user_builds
  add column edit_password_hash text;

-- Never selectable by anon - like edit_token_hash, the column-scoped SELECT
-- grant in 012_user_builds.sql simply doesn't name it, and Postgres refuses
-- to return an unnamed column to that role regardless of what a query asks
-- for. No grant is added here on purpose.

-- ─────────────────────────────────────────────────────────────────────────
-- Sets the password ONCE, proven via the edit token the caller already has
-- (freshly returned from creating the build, in the one flow that calls
-- this). Refuses if a password is already set (`edit_password_hash is null`
-- in the WHERE) - enforced here, at the database level, rather than trusted
-- to the client not re-showing the form, matching "cannot change it after
-- being set".
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.set_user_build_password(
  p_id bigint,
  p_token_hash text,
  p_password_hash text
)
returns table (id bigint)
language sql
security definer
set search_path = public
as $$
  update public.user_builds
  set edit_password_hash = p_password_hash
  where user_builds.id = p_id
    and user_builds.edit_token_hash = p_token_hash
    and user_builds.edit_password_hash is null
  returning user_builds.id;
$$;

revoke all on function public.set_user_build_password(bigint, text, text) from public;
grant execute on function public.set_user_build_password(bigint, text, text) to anon;

-- ─────────────────────────────────────────────────────────────────────────
-- Logging in with the password: verifies it via pgcrypto's crypt() (see the
-- file-level comment above for why that happens here and not in Node) and,
-- only on a match, rotates the edit token to a brand new one the caller
-- supplies the hash of - the server never kept the ORIGINAL raw token (only
-- its hash, since creation), so a successful password login re-issues a
-- fresh credential rather than trying to hand back one that was never
-- stored. The caller then keeps that new token in localStorage exactly like
-- one obtained at creation (see src/utils/myBuilds.js) - this is a full
-- replacement of the edit credential, not an addition, so any OTHER
-- browser's previously saved token for this build stops working the moment
-- this runs.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.login_user_build(
  p_id bigint,
  p_password text,
  p_new_token_hash text
)
returns table (id bigint)
language sql
security definer
set search_path = public
as $$
  update public.user_builds
  set edit_token_hash = p_new_token_hash
  where user_builds.id = p_id
    and user_builds.edit_password_hash is not null
    and user_builds.edit_password_hash = crypt(p_password, user_builds.edit_password_hash)
  returning user_builds.id;
$$;

revoke all on function public.login_user_build(bigint, text, text) from public;
grant execute on function public.login_user_build(bigint, text, text) to anon;
