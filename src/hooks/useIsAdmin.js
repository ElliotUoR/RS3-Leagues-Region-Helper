import { useEffect, useState } from 'react';
import { fetchIsAdmin } from '../utils/api';

// Whether the current visitor is logged in as the JellyFlow admin (see
// utils/api.js's fetchIsAdmin) - drives the "logged in as admin" badge in
// App.jsx. Starts false rather than loading/unknown: the badge only ever
// needs to *appear*, briefly not showing it for a real admin on first paint
// is harmless, whereas a flash of "admin" for a normal visitor would not be.
export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchIsAdmin().then((result) => {
      if (!cancelled) setIsAdmin(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return isAdmin;
}
