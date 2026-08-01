-- Visitor-made blessing and league relic tier lists (see the Tier Lists tab -
-- src/pages/TierListMakerPage.jsx).
--
-- Modelled on short_links (001_init.sql) rather than on user_builds:
--
--   * NO select grant to anon. A tier list is reached by knowing its code, not
--     by browsing, so resolving one goes through get_tier_list() below - a
--     SECURITY DEFINER function that only ever returns the single row matching
--     an exact code. RLS filters rows, not query shape, so a "select your own
--     row" policy could not stop an unfiltered GET from enumerating the table;
--     having no grant at all can.
--
--   * Deduped by payload hash, like 004_short_link_dedup.sql. That matters
--     twice here: re-sharing an unchanged list returns the link that already
--     exists instead of minting a second, AND one visitor pressing Finish,
--     then Export, then Share writes ONE row rather than three - which is what
--     keeps the analytics averages from being skewed by a single person
--     fiddling with their own list.
--
-- `author_name` and `angle` are duplicated out of the payload into their own
-- columns purely so the admin analytics view can list and sort by them without
-- unpacking JSON for every row. The payload remains the source of truth.
--
-- HIDDEN works exactly as it does for user builds: an admin flag that removes
-- a list from every public read. Free text on a public URL needs a way to be
-- taken down.
create table public.tier_lists (
  code          text primary key,
  type          text not null check (type in ('blessings', 'relics')),
  payload       jsonb not null,
  payload_hash  text not null,
  author_name   text not null default '',
  angle         text not null default '',
  hidden        boolean not null default false,
  created_at    timestamptz not null default now()
);

-- One row per distinct list. The insert is a plain INSERT that relies on this
-- constraint rather than checking first, so two simultaneous saves of the same
-- list cannot both win (see server/src/routes/tierLists.js).
create unique index tier_lists_payload_hash_key on public.tier_lists (payload_hash);
create index tier_lists_created_at_idx on public.tier_lists (created_at desc);

alter table public.tier_lists enable row level security;

grant insert on public.tier_lists to anon;
create policy tier_lists_insert on public.tier_lists
  for insert to anon with check (true);

-- ─────────────────────────────────────────────────────────────────────────
-- Exact-code lookup. POST /rpc/get_tier_list {"p_code": "...", "p_type": "..."}
--
-- `p_type` is checked here rather than only in the route: the type is in the
-- URL, so a link with the right code but the wrong type would otherwise render
-- a relic list under a blessings heading. Mismatches return nothing, which the
-- route turns into a 404.
--
-- Hidden lists return nothing too, so hiding one kills its page, its preview
-- image and its report link in a single flag.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.get_tier_list(p_code text, p_type text)
returns table (code text, type text, payload jsonb, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select t.code, t.type, t.payload, t.created_at
  from public.tier_lists t
  where t.code = p_code and t.type = p_type and not t.hidden;
$$;

revoke all on function public.get_tier_list(text, text) from public;
grant execute on function public.get_tier_list(text, text) to anon;

-- The dedup lookup, same shape as get_short_code_for_payload_hash. Returns the
-- oldest matching code so the answer is stable rather than arbitrary.
create or replace function public.get_tier_list_code_for_hash(p_hash text)
returns text
language sql
security definer
set search_path = public
as $$
  select code from public.tier_lists where payload_hash = p_hash order by created_at asc limit 1;
$$;

revoke all on function public.get_tier_list_code_for_hash(text) from public;
grant execute on function public.get_tier_list_code_for_hash(text) to anon;

-- ─────────────────────────────────────────────────────────────────────────
-- Admin: the analytics view reads every row (including hidden ones) through
-- the `analytics` role's direct pg connection, and hiding goes through a
-- SECURITY DEFINER function granted only to that role - unreachable from a
-- browser even though PostgREST is directly addressable.
-- ─────────────────────────────────────────────────────────────────────────
grant select on public.tier_lists to analytics;
create policy analytics_select_tier_lists on public.tier_lists
  for select to analytics using (true);

create or replace function public.set_tier_list_hidden(p_code text, p_hidden boolean)
returns table (code text, hidden boolean)
language sql
security definer
set search_path = public
as $$
  update public.tier_lists set hidden = p_hidden
  where tier_lists.code = p_code
  returning tier_lists.code, tier_lists.hidden;
$$;

revoke all on function public.set_tier_list_hidden(text, boolean) from public;
grant execute on function public.set_tier_list_hidden(text, boolean) to analytics;
