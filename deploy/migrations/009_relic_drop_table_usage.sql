-- Adds a category to usage_counters (see 008_usage_counters.sql) for
-- individual League Relic drop-table views - "how many times was each
-- relic's drop table opened", keyed by relic name, same shape as the
-- existing league_relic_pick counters. See routes/trackCounter.js's
-- VALID_CATEGORIES (kept in sync with this CHECK constraint by hand, same
-- as every other category already in it) and
-- components/RelicDropTablePanel.jsx for where this actually gets fired -
-- one shared component used by every relic that has a dropTable, so any
-- future relic with one is tracked automatically without a further
-- migration or code change here.
--
-- Postgres has no ALTER TABLE ... ALTER CONSTRAINT for CHECK constraints -
-- dropping and re-adding is the standard way to widen one. Looked up by
-- definition text (rather than assuming the default-generated
-- "usage_counters_category_check" name is exactly right) so this can't fail
-- on a naming-convention guess the way a couple of earlier migrations in
-- this repo already have.
do $$
declare
  existing_constraint text;
begin
  select conname into existing_constraint
  from pg_constraint
  where conrelid = 'public.usage_counters'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%category%';

  if existing_constraint is not null then
    execute format('alter table public.usage_counters drop constraint %I', existing_constraint);
  end if;

  alter table public.usage_counters add constraint usage_counters_category_check
    check (category in ('region_pick', 'region_combo', 'league_relic_pick', 'feature', 'relic_drop_table'));
end $$;
