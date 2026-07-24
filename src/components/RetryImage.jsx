import { useEffect, useRef, useState } from 'react';

const RETRY_INTERVAL_MS = 2500;

// Most icons are downloaded and served locally from public/icons/ (see
// scripts/download-icons.mjs) - those are stored in gear.js/regions.js as
// bare relative paths (e.g. "icons/Amulet_of_glory.png") and need the site's
// base URL prefixed, same as RegionMap's map.jpg. A handful of icons that
// couldn't be downloaded are left as full runescape.wiki URLs and used as-is.
function resolveSrc(src) {
  return /^https?:\/\//i.test(src) ? src : `${import.meta.env.BASE_URL}${src}`;
}

// Appends a cache-busting query param on retries. runescape.wiki's CDN can
// answer a burst of concurrent hotlinked requests with a rate-limit response
// that carries cache headers - the browser then caches *that failure* for
// the URL, so simply mounting a new <img> with the identical `src` hits the
// browser's own HTTP cache and gets the same failure back without ever
// reaching the network again. Changing the URL forces a genuinely fresh
// request that bypasses that cached failure. (Only really matters for the
// remaining hotlinked fallback icons - local assets don't get rate-limited -
// but it's harmless to apply uniformly.)
function retryableSrc(src, attempt) {
  const resolved = resolveSrc(src);
  if (attempt === 0) return resolved;
  const separator = resolved.includes('?') ? '&' : '?';
  return `${resolved}${separator}retry=${attempt}`;
}

// Wraps <img> with indefinite retry-on-error for hotlinked runescape.wiki
// icons. There's no terminal "gave up" state shown to the user - on error we
// just wait a couple of seconds and try again, forever, keeping the loading
// placeholder up the whole time. A permanently-broken icon URL is rare
// enough (and indistinguishable from "still rate-limited") that a silent
// stuck-loading box is a better failure mode than a confusing "?" glyph that
// looks like a real, permanent state.
//
// The real <img> stays hidden until it actually finishes loading - the
// placeholder covers it the whole time, so there's never a flash of the
// browser's raw broken-image icon mid-fetch. Once an image has successfully
// loaded once, later error events are ignored - a fast remount/unmount can
// abort an in-flight decode and have the browser report that as an "error"
// even though the image was fine, and without this guard that spurious
// event would flip an already-visible image back into a loading state.
export default function RetryImage({ src, alt, className, loading = 'lazy' }) {
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const loadedOnceRef = useRef(false);
  const retryTimeoutRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    setLoaded(false);
    setAttempt(0);
    loadedOnceRef.current = false;
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [src]);

  // Guards against a real browser race: when an <img> is served from the
  // disk cache (e.g. this exact icon was already fetched by another row, or
  // this is a cache-busted retry), the 'load' event can fire before React
  // finishes attaching the onLoad listener to the freshly-mounted DOM node -
  // the image renders fine but handleLoad is never called, so the
  // placeholder is stuck covering it forever. Checking `.complete` right
  // after commit catches that case.
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      handleLoad();
    }
  }, [attempt]);

  function handleLoad() {
    loadedOnceRef.current = true;
    setLoaded(true);
  }

  function handleError() {
    if (loadedOnceRef.current) return;
    retryTimeoutRef.current = setTimeout(() => setAttempt((prev) => prev + 1), RETRY_INTERVAL_MS);
  }

  const wrapperClass = ['retry-image', className].filter(Boolean).join(' ');

  return (
    <span className={wrapperClass}>
      {!loaded && <span className="retry-image-placeholder" aria-hidden="true" />}
      <img
        key={attempt}
        ref={imgRef}
        src={retryableSrc(src, attempt)}
        alt={alt}
        loading={loading}
        onLoad={handleLoad}
        onError={handleError}
        style={{ visibility: loaded ? 'visible' : 'hidden' }}
      />
    </span>
  );
}
