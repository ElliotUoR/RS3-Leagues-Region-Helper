import { useEffect, useState } from 'react';
import CreateBuildPage from './CreateBuildPage';
import { adminGetUserBuild, fetchIsAdmin, getUserBuild } from '../utils/api';
import { sanitizeUserBuildPayload } from '../utils/userBuildShape';
import { getMyBuildToken } from '../utils/myBuilds';

function idFromHash() {
  const match = /^#edit-build\/(\d+)$/.exec(window.location.hash);
  return match ? Number(match[1]) : null;
}

// Who is allowed to edit this build, and by which route.
//
// The normal answer is an edit token in this browser's localStorage (see
// utils/myBuilds.js) - proof this device created the build, and the only proof
// that exists, since there are no accounts.
//
// The other answer is "an admin", asked of the server directly rather than
// read from useIsAdmin(): that hook starts `false` and settles asynchronously,
// which is right for a badge but would flash "no access" at a real admin here.
// Admin access is a moderation tool - the point is editing an offensive line
// out of a reported build instead of hiding the whole thing - so it reads the
// build through the admin endpoint too, which can see hidden rows.
async function resolveAccess(id) {
  const token = getMyBuildToken(id);
  if (token) return { credential: { token }, load: () => getUserBuild(id) };
  if (await fetchIsAdmin()) return { credential: { asAdmin: true }, load: () => adminGetUserBuild(id) };
  return null;
}

// Resolves "#edit-build/<id>" into the `editing` prop CreateBuildPage needs
// (id, sanitized build, and whichever credential applies), or explains why it
// can't.
export default function EditBuildPage({ onSubmitted }) {
  const [state, setState] = useState('loading'); // loading | no-access | not-found | error | ready
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    const id = idFromHash();
    if (!id) {
      setState('not-found');
      return undefined;
    }

    let cancelled = false;
    resolveAccess(id)
      .then(async (access) => {
        if (cancelled) return;
        if (!access) {
          setState('no-access');
          return;
        }
        const row = await access.load();
        if (cancelled) return;
        const build = sanitizeUserBuildPayload(row.payload);
        if (!build) {
          setState('error');
          return;
        }
        setEditing({ id, build, ...access.credential });
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'loading') {
    return (
      <main className="build-guides-page">
        <p className="build-setup-note">Loading…</p>
      </main>
    );
  }

  if (state === 'no-access') {
    return (
      <main className="build-guides-page">
        <p className="build-setup-note">
          This browser doesn't have edit access to this build - editing only works from the device that
          created it, or as an admin. <a href="#user-builds" className="notice-link">Back to User made builds</a>
        </p>
      </main>
    );
  }

  if (state === 'not-found' || state === 'error') {
    return (
      <main className="build-guides-page">
        <p className="build-setup-note">
          Couldn't load this build. <a href="#user-builds" className="notice-link">Back to User made builds</a>
        </p>
      </main>
    );
  }

  return <CreateBuildPage editing={editing} onSubmitted={onSubmitted} />;
}
