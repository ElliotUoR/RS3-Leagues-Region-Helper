import { useEffect, useState } from 'react';
import CreateBuildPage from './CreateBuildPage';
import PasswordField from '../components/PasswordField';
import { adminGetUserBuild, fetchIsAdmin, getUserBuild, loginUserBuild } from '../utils/api';
import { sanitizeUserBuildPayload } from '../utils/userBuildShape';
import { getMyBuildToken, saveMyBuildToken } from '../utils/myBuilds';

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
//
// Neither applying doesn't mean "no access" anymore - see the `needs-password`
// state below, the edit-password fallback every build now has (see
// deploy/migrations/018_user_build_password.sql).
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
  const [state, setState] = useState('loading'); // loading | needs-password | not-found | error | ready
  const [editing, setEditing] = useState(null);
  const [buildId, setBuildId] = useState(null);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState(null);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    const id = idFromHash();
    if (!id) {
      setState('not-found');
      return undefined;
    }
    setBuildId(id);

    let cancelled = false;
    resolveAccess(id)
      .then(async (access) => {
        if (cancelled) return;
        if (!access) {
          setState('needs-password');
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

  // Exchanges the typed password for a brand-new edit token (see
  // loginUserBuild/login_user_build) and, on success, continues exactly like
  // the token-in-localStorage path above - loads the build and hands it to
  // CreateBuildPage. A wrong password (or a build with none set, e.g. one
  // published before this feature existed) surfaces inline rather than
  // bouncing to a dead end, so the author can just try again.
  async function handlePasswordLogin(event) {
    event.preventDefault();
    if (!loginPassword || loggingIn) return;
    setLoggingIn(true);
    setLoginError(null);
    try {
      const { token } = await loginUserBuild(buildId, loginPassword);
      saveMyBuildToken(buildId, token);
      const row = await getUserBuild(buildId);
      const build = sanitizeUserBuildPayload(row.payload);
      if (!build) {
        setState('error');
        return;
      }
      setEditing({ id: buildId, build, token });
      setState('ready');
    } catch (err) {
      setLoginError(err.message || 'Could not log in.');
    } finally {
      setLoggingIn(false);
    }
  }

  if (state === 'loading') {
    return (
      <main className="build-guides-page">
        <p className="build-setup-note">Loading…</p>
      </main>
    );
  }

  if (state === 'needs-password') {
    return (
      <main className="build-guides-page">
        <form className="build-password-prompt" onSubmit={handlePasswordLogin}>
          <p className="build-setup-note">
            This browser doesn't have edit access to this build. If an edit password was set for it, enter it below.
          </p>
          <PasswordField
            id="build-login-password"
            value={loginPassword}
            onChange={setLoginPassword}
            placeholder="Edit password"
            disabled={loggingIn}
            autoFocus
          />
          {loginError && <p className="build-password-prompt-error">{loginError}</p>}
          <div className="build-password-prompt-actions">
            <button type="submit" className="build-password-prompt-submit" disabled={loggingIn || !loginPassword}>
              {loggingIn ? 'Checking…' : 'Unlock editing'}
            </button>
            <a href="#user-builds" className="notice-link">
              Back to User made builds
            </a>
          </div>
        </form>
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
