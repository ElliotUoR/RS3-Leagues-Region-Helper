// The font stack every server-rendered image draws with.
//
// WHY NOT JUST "sans-serif". @napi-rs/canvas does not honour CSS generic
// family names: given `sans-serif` it takes the first family it happens to have
// registered, which in the production image is DejaVu Sans MONO. Measured
// inside the container - `iiiii` and `WWWWW` both came back 102.3px wide with
// `sans-serif`, versus 58.3 and 187.5 with the family named explicitly. So the
// generic silently produced monospace headings.
//
// Naming DejaVu Sans first fixes production; the `sans-serif` fallback keeps a
// dev machine (which has no DejaVu but plenty of other fonts) rendering
// normally. The two environments therefore use different typefaces - harmless,
// because every width in these renderers is measured at draw time in whichever
// environment is drawing.
//
// The font itself comes from the `font-dejavu` apk package - see
// server/Dockerfile, and note the base image ships with NO fonts at all.
export const SANS = '"DejaVu Sans", sans-serif';

// `weightAndSize` is the leading part of a CSS font shorthand, e.g. '700 30px'
// or 'italic 600 20px'.
export function sans(weightAndSize) {
  return `${weightAndSize} ${SANS}`;
}
