-- Fixes a bug in 005_shortlink_clicks_and_ua.sql: it GRANTed the
-- `analytics` role SELECT on public.short_links, but that table has row-
-- level security enabled (see 001_init.sql) with only an insert policy
-- (scoped to `anon`). Same class of bug 003_analytics_rls_policies.sql
-- already fixed once for page_events - a GRANT alone doesn't make rows
-- visible under RLS without a matching policy, so the admin dashboard's
-- "Short links" table (routes/admin.js) silently got zero rows back from
-- every query - no error, just an empty table.
create policy analytics_select_short_links on public.short_links
  for select to analytics using (true);
