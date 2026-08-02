import { useState } from 'react';
import { isSourceEditable } from '../utils/buildTextEdit';
import { ADMIN_CHANGED_EVENT } from '../hooks/useIsAdmin';

// Localhost-only switch between admin and ordinary visitor, so admin-gated UI
// (hide/feature/edit on user builds, the tier list moderation controls) can be
// checked both ways without opening the JellyFlow dashboard to log in and out.
//
// `import.meta.env.DEV &&` in front is load-bearing, not belt-and-braces:
// isSourceEditable() checks it internally too, but a CALL cannot be folded at
// build time, so written without the literal the whole button - and the word
// "admin" - stays in the production bundle. Same reason TierList writes its own
// CAN_CUSTOMISE this way.
const CAN_TOGGLE = import.meta.env.DEV && isSourceEditable();

// The password from server/.env.dev.example. Tried first so the normal case is
// one click; anyone running a different local password gets prompted instead of
// being stuck. Not a secret in any sense - it only ever reaches a loopback
// server holding throwaway data, and this whole file is compiled out of any
// real build.
const DEV_PASSWORD = 'admin';

export default function AdminDevToggle({ isAdmin }) {
  const [busy, setBusy] = useState(false);
  if (!CAN_TOGGLE) return null;

  async function login(password) {
    return fetch('/Leagues/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password }),
    });
  }

  async function toggle() {
    setBusy(true);
    try {
      if (isAdmin) {
        await fetch('/Leagues/api/admin/logout', { method: 'POST', credentials: 'include' });
      } else {
        let res = await login(DEV_PASSWORD);
        if (res.status === 401) {
          const typed = window.prompt('Local admin password (see server/.env.dev.example):');
          if (!typed) return;
          res = await login(typed);
        }
        if (!res.ok) {
          window.alert('Could not log in as admin - is the API running on :3000?');
          return;
        }
      }
      // The badge and every admin-gated panel read this through
      // /api/admin/whoami, so they are told to re-ask rather than assume.
      window.dispatchEvent(new Event(ADMIN_CHANGED_EVENT));
    } catch {
      window.alert('Could not reach the admin API - is `npm run dev --prefix server` running?');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={`admin-dev-toggle${isAdmin ? ' is-admin' : ''}`}
      onClick={toggle}
      disabled={busy}
      title="Localhost only - switches this browser between admin and ordinary visitor"
    >
      {isAdmin ? 'Admin: on' : 'Admin: off'}
    </button>
  );
}
