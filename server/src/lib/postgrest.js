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
