// Tracks which user-submitted builds THIS browser created, so an "Edit"
// button can show up when its author comes back later - without accounts.
// The edit token itself is the credential (see server/src/routes/userBuilds.js
// and deploy/migrations/012_user_builds.sql's update_user_build() RPC): the
// server only ever stores its sha256 hash, so this localStorage entry is the
// ONLY place the raw token exists after creation. Clearing site data/using a
// different browser loses edit access - there is no recovery path, same
// tradeoff every token-based (rather than account-based) scheme makes.
const STORAGE_KEY = 'rs3-leagues-my-builds';

function loadMap() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveMap(map) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function saveMyBuildToken(id, token) {
  const map = loadMap();
  map[id] = token;
  saveMap(map);
}

export function getMyBuildToken(id) {
  return loadMap()[id] ?? null;
}

export function hasEditAccess(id) {
  return Boolean(getMyBuildToken(id));
}
