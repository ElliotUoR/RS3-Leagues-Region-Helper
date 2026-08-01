// Thin wrapper around PostgREST's HTTP API. No API key/JWT is used - the
// `anon` role is the only role PostgREST resolves unauthenticated requests
// to (see deploy/migrations/001_init.sql), and every table/function grant is
// scoped tightly enough (insert-only, or a single-row RPC lookup) that this
// is safe to call with zero credentials, same as the frontend calling
// PostgREST directly for analytics inserts.
const POSTGREST_URL = process.env.POSTGREST_URL;

if (!POSTGREST_URL) {
  throw new Error('POSTGREST_URL environment variable is required');
}

// Inserts a row. Resolves to `{ conflict: true }` on a unique-constraint
// violation (PostgREST surfaces this as 409) instead of throwing, so callers
// doing generate-and-retry (e.g. short link codes) don't need to parse
// Postgres error codes themselves.
export async function insertRow(table, row) {
  const res = await fetch(`${POSTGREST_URL}/${table}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(row),
  });
  if (res.status === 409) return { conflict: true };
  if (!res.ok) {
    throw new Error(`PostgREST insert into ${table} failed: ${res.status} ${await res.text()}`);
  }
  return { conflict: false };
}

// Calls a single-value-returning Postgres function exposed by PostgREST as
// POST /rpc/<name>, and unwraps the result down to that scalar value.
//
// NOTE: PostgREST's exact JSON shape for a scalar-returning function varies
// by version/config - it may come back as a bare value (`"foo"` / `null`),
// a single object (`{"fn_name": "foo"}`), or an array of one such object.
// This normalizes all three so callers just get the value or `null`. Worth
// double-checking against your actual PostgREST version's real response
// shape when testing this for the first time.
// Calls a `returns void` Postgres function (e.g. increment_usage_counter) -
// PostgREST returns 204 No Content with an empty body for these, so unlike
// callScalarRpc this never tries to parse a response body (attempting
// res.json() on an empty 204 body throws).
export async function callVoidRpc(name, args) {
  const res = await fetch(`${POSTGREST_URL}/rpc/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    throw new Error(`PostgREST rpc ${name} failed: ${res.status} ${await res.text()}`);
  }
}

// Same as insertRow, but for a table where the DB itself generates part of
// the row (e.g. user_builds.id, an identity column) that the caller needs
// back - asks PostgREST to return the inserted row instead of 'minimal', and
// resolves to it directly rather than the `{ conflict }` shape (this is only
// used where a unique-constraint conflict isn't an expected/handled case).
// `select` is REQUIRED, not optional. `Prefer: return=representation` on its own
// makes PostgREST read the inserted row back as `*`, and a table whose grant to
// `anon` is column-scoped (user_builds withholds edit_token_hash - see
// 012_user_builds.sql) then fails the whole INSERT with
// `42501 permission denied for table`, not just the column. Naming the columns
// keeps the read inside what anon is actually allowed to see.
// `signalConflict` makes a unique-constraint violation (PostgREST 409) resolve
// to `{ conflict: true }` instead of throwing, for callers that generate a
// candidate value and retry - short link codes and user build slugs both do
// this. Off by default so an unexpected conflict stays loud.
export async function insertRowReturning(table, row, { select, signalConflict = false } = {}) {
  if (!select) throw new Error(`insertRowReturning(${table}) needs an explicit select list`);
  const res = await fetch(`${POSTGREST_URL}/${table}?select=${encodeURIComponent(select)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(row),
  });
  if (signalConflict && res.status === 409) return { conflict: true };
  if (!res.ok) {
    throw new Error(`PostgREST insert into ${table} failed: ${res.status} ${await res.text()}`);
  }
  const [inserted] = await res.json();
  return inserted;
}

// GETs rows from a table through PostgREST's own query-string filter syntax
// (e.g. `id=eq.5`, `order=created_at.desc`, `limit=50`) - `query` is passed
// straight through unescaped-beyond-URLSearchParams, so callers build it with
// exact PostgREST operators rather than this wrapper inventing its own query
// language. Only usable against a table `anon` actually has a SELECT grant +
// RLS policy on (currently just user_builds - see
// deploy/migrations/012_user_builds.sql) - every other table in this schema
// grants `anon` insert only, so a select against those simply 403s.
export async function selectRows(table, query) {
  const qs = query instanceof URLSearchParams ? query : new URLSearchParams(query);
  const res = await fetch(`${POSTGREST_URL}/${table}?${qs}`);
  if (!res.ok) {
    throw new Error(`PostgREST select from ${table} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

// For a `returns table (...)` function with more than one column, where
// callScalarRpc's collapse-to-first-value would throw the rest away.
export async function callTableRpc(name, args) {
  const res = await fetch(`${POSTGREST_URL}/rpc/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    throw new Error(`PostgREST rpc ${name} failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [data].filter(Boolean);
}

export async function callScalarRpc(name, args) {
  const res = await fetch(`${POSTGREST_URL}/rpc/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    throw new Error(`PostgREST rpc ${name} failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  if (data === null || data === undefined) return null;
  if (typeof data !== 'object') return data;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  const values = Object.values(row);
  return values.length ? values[0] : null;
}
