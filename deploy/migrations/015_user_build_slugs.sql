-- Shareable URLs for user-submitted builds.
--
-- A user build has only had a numeric id, reachable at best as
-- "#user-builds" plus a click. It now gets a slug so it can live at
-- /Leagues/build-guides/<slug>, exactly like this site's own guides - a real
-- link you can paste into Discord, and (because the slug is in the PATH, not
-- the fragment) one the server can see and render a per-build preview image
-- for. See server/src/routes/buildGuidePage.js for why the hash form cannot.
--
-- ONE NAMESPACE, SHARED WITH THE CURATED GUIDES. /build-guides/<x> resolves a
-- curated guide first and a user build second, so a user slug that collided
-- with a curated id would simply be unreachable. The generator therefore
-- treats the curated ids as reserved. They are hardcoded below because a
-- migration is a point-in-time artefact and cannot import a JS module; the
-- live generator (server/src/lib/userBuildSlug.js) reads the real list, so
-- guides added later are covered without another migration.
--
-- STABLE ONCE SET. Renaming a build does NOT change its slug, here or in the
-- create/edit routes - a shared link has to keep working, and a slug that
-- tracked the name would break every link the moment its author fixed a typo.

alter table public.user_builds add column slug text;

do $$
declare
  -- data/blessingBuilds.js ids as of this migration.
  reserved text[] := array[
    'teragards-bulwark', 'the-ironclad', 'the-berserker', 'the-avalanche',
    'the-reaper', 'the-undying', 'the-shieldbearer'
  ];
  b record;
  base text;
  candidate text;
  n int;
begin
  for b in select id, name from public.user_builds order by id loop
    -- Same shape as slugify() in server/src/lib/userBuildSlug.js: apostrophes
    -- are deleted outright (so "Teragard's Bulwark" -> "teragards-bulwark",
    -- matching how the curated ids are written), then runs of anything that is
    -- not a letter or digit collapse to one hyphen, trimmed at both ends, then
    -- capped - and trimmed again, since the cap can land mid-separator.
    base := regexp_replace(b.name, '[''‘’]', '', 'g');
    base := lower(regexp_replace(regexp_replace(base, '[^a-zA-Z0-9]+', '-', 'g'), '(^-+|-+$)', '', 'g'));
    base := regexp_replace(left(base, 60), '-+$', '');
    if base is null or base = '' then
      base := 'build';
    end if;

    candidate := base;
    n := 1;
    while candidate = any(reserved)
       or exists (select 1 from public.user_builds where slug = candidate) loop
      n := n + 1;
      candidate := base || '-' || n;
    end loop;

    update public.user_builds set slug = candidate where id = b.id;
  end loop;
end $$;

alter table public.user_builds alter column slug set not null;

-- The uniqueness is a constraint, not application logic: the create route
-- generates a candidate and retries on conflict (same pattern short link codes
-- already use), which is only correct because two concurrent inserts cannot
-- both win here.
create unique index user_builds_slug_key on public.user_builds (slug);

-- 012 grants SELECT column-by-column, so a new column is invisible to `anon`
-- until it is named.
grant select (slug) on public.user_builds to anon;
