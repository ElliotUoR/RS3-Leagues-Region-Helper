-- Deduplicates short link creation: re-sharing the same build repeatedly
-- (no changes in between) previously always inserted a brand new row/code,
-- since /api/shorten never checked for an existing match - see
-- server/src/routes/shorten.js.
--
-- payload itself isn't indexed directly because Postgres btree index
-- entries are capped at roughly a third of the page size (~2704 bytes on
-- the default 8kB page) - MAX_PAYLOAD_LENGTH in shorten.js allows up to
-- 10,000 characters, comfortably over that limit. sha256(payload) is a
-- fixed 64-char hex string instead - a collision would return the wrong
-- existing link for a different payload, but that's cryptographically
-- negligible at any realistic volume (unlike md5/sha1, not worth trading
-- for a shorter hash here).
alter table public.short_links add column payload_hash text;
update public.short_links set payload_hash = encode(sha256(payload::bytea), 'hex') where payload_hash is null;
alter table public.short_links alter column payload_hash set not null;

-- Deliberately NOT a unique index: this server predates dedup, so rows
-- already exist where two different codes share an identical payload (the
-- same build shared more than once before /api/shorten started checking
-- first). A unique index would fail to create against that existing data,
-- and deleting the "duplicate" rows to force uniqueness would 404 whichever
-- of those old codes is already out in the wild (bookmarked, shared
-- elsewhere, etc) - not worth it just to close a narrow race (two requests
-- for the exact same brand-new payload landing within milliseconds of each
-- other, which at worst produces one harmless extra code, not a bug).
create index short_links_payload_hash_idx on public.short_links (payload_hash);

-- Exposed by PostgREST as POST /rpc/get_short_code_for_payload_hash
-- body: {"p_hash": "<sha256 hex>"} - same SECURITY DEFINER pattern as
-- get_short_link_payload in 001_init.sql (anon has no SELECT grant on
-- short_links at all, so this is the only way to look anything up, and it
-- only ever returns one row for one exact hash - no enumeration path).
-- `order by created_at asc` makes the choice deterministic for the
-- pre-existing duplicates above - always the original/oldest code for a
-- given payload, never an arbitrary one.
create or replace function public.get_short_code_for_payload_hash(p_hash text)
returns text
language sql
security definer
set search_path = public
as $$
  select code from public.short_links where payload_hash = p_hash order by created_at asc limit 1;
$$;

revoke all on function public.get_short_code_for_payload_hash(text) from public;
grant execute on function public.get_short_code_for_payload_hash(text) to anon;
