import { useEffect, useState } from 'react';
import { fetchIsAdmin } from '../utils/api';

// Fired by the localhost admin toggle (components/AdminDevToggle.jsx). The
// answer lives in an httpOnly cookie this hook can only read through the
// server, so flipping it has to tell every consumer to ask again - otherwise
// the badge, the moderation controls and the user-build listing would each keep
// whatever they learned on mount.
export const ADMIN_CHANGED_EVENT = 'rs3-leagues-admin-changed';

// Whether the current visitor is logged in as the JellyFlow admin (see
// utils/api.js's fetchIsAdmin) - drives the "logged in as admin" badge in
// App.jsx. Starts false rather than loading/unknown: the badge only ever
// needs to *appear*, briefly not showing it for a real admin on first paint
// is harmless, whereas a flash of "admin" for a normal visitor would not be.
export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = () =>
      fetchIsAdmin().then((result) => {
        if (!cancelled) setIsAdmin(result);
      });
    check();
    window.addEventListener(ADMIN_CHANGED_EVENT, check);
    return () => {
      cancelled = true;
      window.removeEventListener(ADMIN_CHANGED_EVENT, check);
    };
  }, []);

  return isAdmin;
}
