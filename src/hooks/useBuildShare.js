import { useState } from 'react';
import { COMBAT_STYLES } from '../data/gear';
import { buildShareUrl } from '../utils/shareBuild';
import { copyShareLink, shareLinkFor } from '../utils/shareLink';
import { IS_PAGES_BUILD } from '../utils/deployTarget';

// The Gear Planner's "Share build" button, extracted so My Build can carry the
// same one. Both share the SAME thing - the whole setup, every style's gear
// plus regions, relics and blessings - so duplicating the handler would have
// meant two copies of the short-link fallback and the default-style fix below.
//
// Returns one button's worth of state regardless of which of the two share
// mechanisms is in play, so callers do not have to know which they got.

const SHARE_LABELS = { idle: 'Share build', copied: 'Link copied!', manual: 'Link ready' };

const SHORTEN_LABELS = {
  idle: 'Share build',
  working: 'Creating…',
  copied: 'Link copied!',
  manual: 'Link ready',
  error: 'Share unavailable',
};

// `payload` is everything the link encodes; `setDefaultStyle` is needed only
// for the fallback described below, so a caller with nothing to correct can
// leave it out.
export function useBuildShare({ payload, setDefaultStyle }) {
  const [status, setStatus] = useState('idle');

  // GitHub Pages has no backend, so /api/shorten does not exist there - the
  // full `?share=` link is handled entirely client-side and always works.
  async function shareLongLink() {
    const url = buildShareUrl(payload);
    try {
      await navigator.clipboard.writeText(url);
      setStatus('copied');
    } catch {
      window.prompt('Copy this link to share your build:', url);
      setStatus('manual');
    }
    setTimeout(() => setStatus('idle'), 2500);
  }

  async function shareShortLink() {
    setStatus('working');
    try {
      // The default style is baked into the short link, so a build whose
      // default style has nothing equipped - easy to end up with, since not
      // everyone re-ticks "Default" after switching styles - would hand the
      // recipient an empty tab first. Fall back to the first style that
      // actually has gear, and adopt it as the real default rather than only
      // patching the link's payload.
      let defaultStyle = payload.defaultStyle;
      const styleHasGear = (s) => Object.keys(payload.equippedNamesByStyle?.[s] ?? {}).length > 0;
      if (!styleHasGear(defaultStyle)) {
        const fallback = COMBAT_STYLES.find(styleHasGear);
        if (fallback) {
          defaultStyle = fallback;
          setDefaultStyle?.(fallback);
        }
      }
      // shareLinkFor caches per payload and the backend looks the payload hash
      // up before inserting, so re-sharing an unchanged build returns the code
      // that already exists - see utils/shareLink.js.
      const url = await shareLinkFor({ ...payload, defaultStyle });
      setStatus(await copyShareLink(url));
    } catch {
      setStatus('error');
    }
    setTimeout(() => setStatus('idle'), 2500);
  }

  return {
    label: IS_PAGES_BUILD ? SHARE_LABELS[status] : SHORTEN_LABELS[status],
    disabled: status === 'working',
    share: IS_PAGES_BUILD ? shareLongLink : shareShortLink,
  };
}
