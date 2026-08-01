-- Featuring a user build onto the Build Guides page, and letting an admin edit
-- one. Builds on 012_user_builds.sql (the table) and
-- 013_user_build_votes_and_moderation.sql (hiding).
--
-- FEATURING is the positive counterpart to hiding: hiding takes a build away
-- from everyone, featuring promotes one onto the curated Build Guides page
-- alongside this site's own builds. Both are admin-only and both go through a
-- SECURITY DEFINER function granted to `analytics` (the role the dashboard's
-- direct pg connection already uses) rather than an UPDATE grant, so neither is
-- reachable from a browser even though PostgREST is directly addressable.
--
-- `featured_at` exists separately from the flag so the featured strip has a
-- stable order that is NOT creation order - an admin featuring an old build
-- should put it at the front, not bury it. Re-featuring something already
-- featured keeps its original slot (see the coalesce below); un-featuring
-- clears the timestamp, so re-featuring later moves it to the front.

alter table public.user_builds
  add column featured    boolean not null default false,
  add column featured_at timestamptz;

-- 012 grants SELECT column-by-column rather than table-wide (so
-- `edit_token_hash` can never leak), which means a newly added column is
-- invisible to `anon` until it is named here too.
grant select (featured, featured_at) on public.user_builds to anon;

-- Matches the featured listing's exact query: `where featured and not hidden`,
-- newest-featured first.
create index user_builds_featured_idx
  on public.user_builds (featured_at desc)
  where featured and not hidden;

create or replace function public.set_user_build_featured(p_id bigint, p_featured boolean)
returns table (id bigint, featured boolean, featured_at timestamptz)
language sql
security definer
set search_path = public
as $$
  update public.user_builds
  -- Unqualified `featured_at` in an UPDATE's SET reads the OLD value, so this
  -- only stamps a time the first time a build is featured.
  set featured = p_featured,
      featured_at = case when p_featured then coalesce(user_builds.featured_at, now()) else null end
  where user_builds.id = p_id
  returning user_builds.id, user_builds.featured, user_builds.featured_at;
$$;

revoke all on function public.set_user_build_featured(bigint, boolean) from public;
grant execute on function public.set_user_build_featured(bigint, boolean) to analytics;

-- ─────────────────────────────────────────────────────────────────────────
-- Admin editing.
--
-- Deliberately a SEPARATE function from update_user_build() rather than a
-- "skip the token check if you're an admin" flag on it: update_user_build is
-- granted to `anon` and its token comparison is the ONLY thing standing
-- between a stranger and rewriting someone else's build, so it must not grow a
-- branch that can bypass that check. This one has no token parameter at all
-- and is granted only to `analytics`, so the two paths cannot be confused.
--
-- Moderation, not co-authorship: the reason this exists is that a reported
-- build might need one offensive line removed rather than the whole thing
-- hidden, and hiding was previously the only lever.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.admin_update_user_build(
  p_id bigint,
  p_name text,
  p_tagline text,
  p_author_name text,
  p_styles text[],
  p_payload jsonb
)
returns table (id bigint)
language sql
security definer
set search_path = public
as $$
  update public.user_builds
  set name = p_name,
      tagline = p_tagline,
      author_name = p_author_name,
      styles = p_styles,
      payload = p_payload
  where user_builds.id = p_id
  returning user_builds.id;
$$;

revoke all on function public.admin_update_user_build(bigint, text, text, text, text[], jsonb) from public;
grant execute on function public.admin_update_user_build(bigint, text, text, text, text[], jsonb) to analytics;

-- ─────────────────────────────────────────────────────────────────────────
-- Fixes an omission in 012: update_user_build() never wrote `author_name`, so
-- the edit form's author field silently discarded any change to it - the value
-- was sent by the client, accepted by the route, and then dropped on the floor
-- here. The signature has to change to take it, which means dropping the old
-- one rather than `create or replace` (a different argument list would
-- otherwise create a second overload and leave the broken version callable).
-- ─────────────────────────────────────────────────────────────────────────
drop function public.update_user_build(bigint, text, text, text, text[], jsonb);

create function public.update_user_build(
  p_id bigint,
  p_token_hash text,
  p_name text,
  p_tagline text,
  p_author_name text,
  p_styles text[],
  p_payload jsonb
)
returns table (id bigint)
language sql
security definer
set search_path = public
as $$
  update public.user_builds
  set name = p_name,
      tagline = p_tagline,
      author_name = p_author_name,
      styles = p_styles,
      payload = p_payload
  where user_builds.id = p_id and user_builds.edit_token_hash = p_token_hash
  returning user_builds.id;
$$;

revoke all on function public.update_user_build(bigint, text, text, text, text, text[], jsonb) from public;
grant execute on function public.update_user_build(bigint, text, text, text, text, text[], jsonb) to anon;
