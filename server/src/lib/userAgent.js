// Lightweight User-Agent parsing for the admin dashboard's browser/OS/device
// breakdown - deliberately not a full UA-parsing dependency, just enough to
// bucket traffic into readable categories. Order matters throughout: many
// browsers/OSes embed other engines' tokens in their UA string (Edge and
// Opera both include "Chrome/...", Chrome includes "Safari/...", Android
// includes "Linux", iPhone/iPad include "like Mac OS X"), so the more
// specific checks always run first.

function detectBrowser(ua) {
  if (/bot|crawl|spider|slurp|bingpreview|facebookexternalhit/i.test(ua)) return 'Bot';
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\/|Opera/.test(ua)) return 'Opera';
  if (/SamsungBrowser\//.test(ua)) return 'Samsung Internet';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/CriOS\//.test(ua)) return 'Chrome'; // Chrome on iOS
  if (/Chrome\//.test(ua)) return 'Chrome';
  if (/FxiOS\//.test(ua)) return 'Firefox'; // Firefox on iOS
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Other';
}

function detectOS(ua) {
  if (/Windows NT/.test(ua)) return 'Windows';
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac OS X/.test(ua)) return 'macOS';
  if (/CrOS/.test(ua)) return 'ChromeOS';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Other';
}

function detectDeviceType(ua, browser) {
  if (browser === 'Bot') return 'bot';
  if (/iPad/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua))) return 'tablet';
  if (/Mobile|iPhone|iPod/.test(ua)) return 'mobile';
  return 'desktop';
}

// Returns { browser, os, deviceType }, each a short readable label (never
// the raw UA string itself - only the derived category is ever persisted,
// see routes/track.js).
export function parseUserAgent(userAgent) {
  const ua = typeof userAgent === 'string' ? userAgent : '';
  const browser = detectBrowser(ua);
  return {
    browser,
    os: detectOS(ua),
    deviceType: detectDeviceType(ua, browser),
  };
}
