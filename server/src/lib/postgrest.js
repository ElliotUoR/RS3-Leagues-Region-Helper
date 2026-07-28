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
