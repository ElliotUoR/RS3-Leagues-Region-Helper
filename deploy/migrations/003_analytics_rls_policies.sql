-- Fixes a bug in 002_analytics_rollup.sql: it GRANTed the `analytics` role
-- select/delete on public.page_events, but that table has row-level
-- security enabled (see 001_init.sql) with only an insert policy (scoped to
-- `anon`). With RLS on, a GRANT alone doesn't make rows visible - without a
-- matching policy, `analytics` silently got zero rows back from every
-- select/delete against page_events (no error, just empty results), which
-- meant both the daily rollup job (lib/analyticsRollup.js) and the admin
-- summary endpoint's raw-recent-days queries (routes/admin.js) were
-- reading nothing.
create policy analytics_select_page_events on public.page_events
  for select to analytics using (true);

create policy analytics_delete_page_events on public.page_events
  for delete to analytics using (true);
