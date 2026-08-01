-- Adds voting and admin moderation to user-submitted builds
-- (see 012_user_builds.sql for the table itself).
--
-- MODERATION. 012 already had a `hidden` flag, but deliberately no way to set
-- it: hiding a build meant a manual `update ... set hidden = true` from a psql
-- prompt. That was fine when nothing could be reported; it is not fine now that
-- a Report button exists, so the admin dashboard needs to do it. `anon` still
-- gets no UPDATE grant on the table - the flip goes through the SECURITY
-- DEFINER function below, which the Node service only calls behind
-- requireAdmin (see server/src/routes/userBuilds.js).
--
-- `hidden` semantics are unchanged and still enforced by the RLS policy from
-- 012: a hidden row is invisible to `anon` entirely. The admin view does not go
-- through `anon` at all - it uses the `analytics` role's direct pg connection,
-- the same one the dashboard already uses - so an admin can still see and
-- un-hide what everyone else cannot.

-- ─────────────────────────────────────────────────────────────────────────
-- Votes. One row per (build, session) so a session can only ever count once,
-- enforced by the primary key rather than by application logic - the same
-- pseudonymous session id the analytics pipeline derives from IP + User-Agent
-- + a daily-rotating salt (see server/src/lib/session.js). That id rotates at
-- UTC midnight by design, so "one vote per session" means one vote per
-- browser per day, not one forever. That is the honest limit of voting
-- without accounts, and it is the same trade every other count on this site
-- already makes.
-- ─────────────────────────────────────────────────────────────────────────
create table public.user_build_votes (
  build_id    bigint not null references public.user_builds(id) on delete cascade,
  session_id  text not null,
  vote        smallint not null check (vote in (-1, 1)),
  created_at  timestamptz not null default now(),
  primary key (build_id, session_id)
);

create index user_build_votes_build_idx on public.user_build_votes (build_id);

alter table public.user_build_votes enable row level security;

-- No grants to anon at all: every read and write goes through the functions
-- below. A direct PostgREST call against this table gets nothing.
grant select, delete on public.user_build_votes to analytics;
create policy analytics_select_votes on public.user_build_votes
  for select to analytics using (true);
create policy analytics_delete_votes on public.user_build_votes
  for delete to analytics using (true);

-- ─────────────────────────────────────────────────────────────────────────
-- Casting a vote. Upserts, so changing your mind replaces your previous vote
-- rather than adding a second one, and re-sending the same vote is a no-op.
-- Returns the build's resulting score.
--
-- SCORE FLOOR: the score reported to the client is clamped at 0 - a build can
-- never show negative. The underlying rows are NOT clamped, so a build sitting
-- at a true -12 has to climb all the way back before it moves off 0; that is
-- deliberate, otherwise a single upvote on a heavily-downvoted build would
-- bounce it straight to 1.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.cast_user_build_vote(
  p_build_id bigint,
  p_session_id text,
  p_vote smallint
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  total integer;
begin
  -- Never let a vote land on a build that is hidden or does not exist.
  if not exists (select 1 from public.user_builds where id = p_build_id and not hidden) then
    return null;
  end if;

  if p_vote = 0 then
    delete from public.user_build_votes where build_id = p_build_id and session_id = p_session_id;
  else
    insert into public.user_build_votes (build_id, session_id, vote)
    values (p_build_id, p_session_id, p_vote)
    on conflict (build_id, session_id) do update set vote = excluded.vote, created_at = now();
  end if;

  select coalesce(sum(vote), 0) into total from public.user_build_votes where build_id = p_build_id;
  return greatest(total, 0);
end $$;

revoke all on function public.cast_user_build_vote(bigint, text, smallint) from public;
grant execute on function public.cast_user_build_vote(bigint, text, smallint) to anon;

-- Reading scores for the listing, plus what THIS session already voted, in one
-- call - so the buttons can render in their correct state on first paint
-- rather than flashing un-voted.
create or replace function public.get_user_build_votes(p_session_id text)
returns table (build_id bigint, score integer, my_vote smallint)
language sql
security definer
set search_path = public
as $$
  select b.id,
         greatest(coalesce(sum(v.vote), 0), 0)::integer,
         coalesce(max(v.vote) filter (where v.session_id = p_session_id), 0)::smallint
  from public.user_builds b
  left join public.user_build_votes v on v.build_id = b.id
  where not b.hidden
  group by b.id;
$$;

revoke all on function public.get_user_build_votes(text) from public;
grant execute on function public.get_user_build_votes(text) to anon;

-- ─────────────────────────────────────────────────────────────────────────
-- Admin hide/unhide. Called only from the Node service behind requireAdmin -
-- there is no anon grant, so this is unreachable from a browser even though
-- PostgREST is directly addressable.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.set_user_build_hidden(p_id bigint, p_hidden boolean)
returns table (id bigint, hidden boolean)
language sql
security definer
set search_path = public
as $$
  update public.user_builds set hidden = p_hidden
  where user_builds.id = p_id
  returning user_builds.id, user_builds.hidden;
$$;

revoke all on function public.set_user_build_hidden(bigint, boolean) from public;
grant execute on function public.set_user_build_hidden(bigint, boolean) to analytics;

-- The admin listing needs to see hidden rows, which the anon RLS policy on
-- 012 forbids. `analytics` is the role the dashboard's direct pg connection
-- already uses, so it gets its own unrestricted read here.
grant select on public.user_builds to analytics;
create policy analytics_select_user_builds on public.user_builds
  for select to analytics using (true);
