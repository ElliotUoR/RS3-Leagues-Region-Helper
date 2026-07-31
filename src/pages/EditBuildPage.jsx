import { useEffect, useState } from 'react';
import CreateBuildPage from './CreateBuildPage';
import { getUserBuild } from '../utils/api';
import { sanitizeUserBuildPayload } from '../utils/userBuildShape';
import { getMyBuildToken } from '../utils/myBuilds';

function idFromHash() {
  const match = /^#edit-build\/(\d+)$/.exec(window.location.hash);
  return match ? Number(match[1]) : null;
}

// Resolves "#edit-build/<id>" into the `editing` prop CreateBuildPage needs
// (id/token/sanitized build), or explains why it can't - no token in this
// browser's localStorage (see utils/myBuilds.js) means this device didn't
// create the build, and there is no recovery path since there are no
// accounts (see that file's own comment on the tradeoff).
export default function EditBuildPage({ onSubmitted }) {
  const [state, setState] = useState('loading'); // loading | no-access | not-found | error | ready
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    const id = idFromHash();
    if (!id) {
      setState('not-found');
      return undefined;
    }
    const token = getMyBuildToken(id);
    if (!token) {
      setState('no-access');
      return undefined;
    }

    let cancelled = false;
    getUserBuild(id)
      .then((row) => {
        if (cancelled) return;
        const build = sanitizeUserBuildPayload(row.payload);
        if (!build) {
          setState('error');
          return;
        }
        setEditing({ id, token, build });
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
          created it. <a href="#user-builds" className="notice-link">Back to User made builds</a>
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
