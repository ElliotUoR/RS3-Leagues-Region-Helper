import { useEffect, useState } from 'react';
import CreateBuildPage from './CreateBuildPage';
import { getUserBuild } from '../utils/api';
import { sanitizeUserBuildPayload } from '../utils/userBuildShape';

function idFromHash() {
  const match = /^#create-build-from\/(\d+)$/.exec(window.location.hash);
  return match ? Number(match[1]) : null;
}

// Resolves "#create-build-from/<id>" into the `copyFrom` prop CreateBuildPage
// needs - fetches the source build the same way the public listing does (no
// access check at all: any visible build can be copied from, unlike
// EditBuildPage's token/admin/password gates, since copying never touches the
// original build).
export default function CopyBuildPage({ onSubmitted }) {
  const [state, setState] = useState('loading'); // loading | not-found | error | ready
  const [copyFrom, setCopyFrom] = useState(null);

  useEffect(() => {
    const id = idFromHash();
    if (!id) {
      setState('not-found');
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
        setCopyFrom(build);
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

  if (state === 'not-found' || state === 'error') {
    return (
      <main className="build-guides-page">
        <p className="build-setup-note">
          Couldn't load this build to copy. <a href="#user-builds" className="notice-link">Back to User made builds</a>
        </p>
      </main>
    );
  }

  return <CreateBuildPage copyFrom={copyFrom} onSubmitted={onSubmitted} />;
}
