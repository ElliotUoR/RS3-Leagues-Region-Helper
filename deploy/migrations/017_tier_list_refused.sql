-- Refusing a tier list: it stays readable, but stops counting.
--
-- DELIBERATELY NOT `hidden` (016_tier_lists.sql). The two answer different
-- questions and an admin needs both:
--
--   hidden   - "nobody should see this." Takes the page, the preview image and
--              the report link away. Says nothing about the ranking itself, so
--              a list hidden for an offensive author name still counts toward
--              the community averages.
--
--   refused  - "this is not a real opinion." A joke list, a test, ten lists
--              from the same person, someone dumping everything in S. It stays
--              viewable - the link may already be shared - but it is excluded
--              from the community ranking and from most-divisive/most-agreed.
--
-- Folding them into one flag would force a choice between leaving junk in the
-- averages and deleting something a visitor may already have a link to.
alter table public.tier_lists add column refused boolean not null default false;

-- Partial index matching the stats query, which reads only the counted rows.
create index tier_lists_counted_idx on public.tier_lists (type) where not refused;

create or replace function public.set_tier_list_refused(p_code text, p_refused boolean)
returns table (code text, refused boolean)
language sql
security definer
set search_path = public
as $$
  update public.tier_lists set refused = p_refused
  where tier_lists.code = p_code
  returning tier_lists.code, tier_lists.refused;
$$;

revoke all on function public.set_tier_list_refused(text, boolean) from public;
grant execute on function public.set_tier_list_refused(text, boolean) to analytics;
