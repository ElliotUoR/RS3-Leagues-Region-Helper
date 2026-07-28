import { Router } from 'express';
import { callScalarRpc } from '../lib/postgrest.js';
import { decodeShareBuildForImage } from '../lib/shareBuild.js';
import { renderShareImage } from '../lib/ogImageRender.js';

export const ogImageRouter = Router();

// GET /api/og-image/:code.png - renders a share-link preview image on
// demand. A short code's payload never changes once created (see
// routes/shorten.js), so the response is cacheable indefinitely - Discord/
// Twitter/etc. will hit this once per link and then use their own cached
// copy for future unfurls.
ogImageRouter.get('/api/og-image/:code.png', async (req, res) => {
  const { code } = req.params;

  try {
    const payload = await callScalarRpc('get_short_link_payload', { p_code: code });
    if (!payload) return res.status(404).send('not found');

    const decoded = decodeShareBuildForImage(payload);
    if (!decoded) return res.status(404).send('not found');

    const png = await renderShareImage({
      unlockedRegionIds: decoded.unlockedRegionIds,
      equippedNames: decoded.equippedNames,
      eofWeaponName: decoded.eofWeaponName,
      defaultStyle: decoded.defaultStyle ?? 'melee',
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(png);
  } catch (err) {
    console.error('og-image render failed:', err);
    res.status(500).send('render failed');
  }
});
