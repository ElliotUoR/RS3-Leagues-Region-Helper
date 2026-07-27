-- Lets the frontend look up a short link's payload without it counting as
-- a click - used only for the admin's own visits (see App.jsx's short-link
-- resolution effect, gated on utils/api.js's fetchIsAdmin) so browsing your
-- own share links from the admin panel doesn't inflate click_count/
-- last_clicked_at (see 005_shortlink_clicks_and_ua.sql).
--
-- Same SECURITY DEFINER / anon-EXECUTE pattern as get_short_link_payload,
-- and exposes nothing that one doesn't already - this is a strict subset
-- (pure lookup, no side effect). Reachable by any visitor who knows to call
-- it directly, not enforced as admin-only: click_count is an approximate
-- analytics number, not a security boundary, so that's an acceptable
-- tradeoff against the alternative of verifying the admin's signed session
-- cookie from inside Postgres - the secret it's signed with lives only in
-- the Node service's environment, never in the database (see
-- server/src/lib/adminAuth.js).
create or replace function public.get_short_link_payload_untracked(p_code text)
returns text
language sql
security definer
set search_path = public
as $$
  select payload from public.short_links where code = p_code;
$$;

revoke all on function public.get_short_link_payload_untracked(text) from public;
grant execute on function public.get_short_link_payload_untracked(text) to anon;
