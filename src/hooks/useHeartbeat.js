import { useEffect } from 'react';
import { trackHeartbeat } from '../utils/api';

// How often an open tab says "still here". The server's active window is
// deliberately longer than this (see server/src/lib/activeSessions.js), so one
// missed request never drops a visitor out of the count.
const HEARTBEAT_INTERVAL_MS = 60 * 1000;

// Keeps a reading visitor inside the "active users" window.
//
// A pageview only fires on a route change, so someone who opens a build guide
// and reads it for ten minutes emits exactly one event and then looks idle.
// This is the ping that fixes that.
//
// Only ever fires while the tab is actually VISIBLE. A background tab left open
// for days is not an active user, and counting it would quietly inflate the
// number forever - which is the usual way this metric ends up lying. Sending
// one immediately on becoming visible (not just on the interval) means
// returning to a backgrounded tab registers at once rather than up to a minute
// later.
export function useHeartbeat() {
  useEffect(() => {
    let timer = null;

    function stop() {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    }

    function start() {
      if (timer !== null) return;
      trackHeartbeat();
      timer = setInterval(trackHeartbeat, HEARTBEAT_INTERVAL_MS);
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') start();
      else stop();
    }

    onVisibilityChange();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);
}
