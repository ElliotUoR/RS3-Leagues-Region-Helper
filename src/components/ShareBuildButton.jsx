import { useState } from 'react';
import { absoluteBuildGuideUrl } from '../utils/buildGuideRoute';
import { copyShareLink } from '../utils/shareLink';

// Copies a user build's own shareable URL - /Leagues/build-guides/<slug>.
//
// Deliberately NOT a short link, unlike the "Open in gear planner" button on
// the curated guides. That one has to encode a whole loadout into a code
// because there is nowhere else for it to live; this build already has a
// permanent address, and a short link pointing at it would only add a
// redirect, a database row, and a second URL that can rot.
//
// The preview image comes free with that address: the slug is in the PATH, so
// the server sees it, looks the build up and renders a thumbnail of its actual
// gear on the fly (see server/src/routes/buildGuidePage.js). A "#..." link
// could never do that - fragments are not sent in the request.
const LABELS = {
  idle: 'Share',
  copied: 'Link copied',
  manual: 'Link ready',
};

export default function ShareBuildButton({ slug }) {
  const [status, setStatus] = useState('idle');

  if (!slug) return null;

  async function handleClick() {
    setStatus(await copyShareLink(absoluteBuildGuideUrl(slug)));
  }

  return (
    <button
      type="button"
      className={`build-share-button${status !== 'idle' ? ' shared' : ''}`}
      onClick={handleClick}
    >
      {LABELS[status]}
    </button>
  );
}
