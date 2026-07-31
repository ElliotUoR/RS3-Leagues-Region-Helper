import { useEffect, useRef, useState } from 'react';
import { saveBuildText } from '../utils/buildTextEdit';

// One editable string on the Build Guides page. Renders its children untouched
// unless edit mode is on, so the normal reading experience is unaffected.
//
// Split into a thin wrapper plus a dev-only inner component on purpose:
//   - the wrapper's guard is `import.meta.env.DEV`, a compile-time literal, so
//     in a production build it folds to `if (true) return children` and
//     EditableTextEditor becomes unreferenced - Rollup then drops it and the
//     saveBuildText import with it. Verified by grepping dist/.
//   - keeping every hook inside the inner component means no hook is ever
//     called conditionally, which a single-component version could not avoid.
export default function EditableText({ children, value, ...rest }) {
  if (!import.meta.env.DEV) return children ?? value ?? null;
  return (
    <EditableTextEditor value={value} {...rest}>
      {children}
    </EditableTextEditor>
  );
}

// Saving writes straight back into src/data/blessingBuilds.js. The new value is
// also held locally so the card updates immediately - Vite's HMR reloads the
// data module a moment later and agrees with it.
function EditableTextEditor({ editing, buildId, path, value, children, as: Tag = 'span' }) {
  const [draft, setDraft] = useState(value);
  const [saved, setSaved] = useState(null);
  const [status, setStatus] = useState(null);
  const [open, setOpen] = useState(false);
  const areaRef = useRef(null);

  // A prop change means the file was reloaded (HMR) or the build switched -
  // either way the incoming value is now the truth.
  useEffect(() => {
    setDraft(value);
    setSaved(null);
  }, [value]);

  useEffect(() => {
    const area = areaRef.current;
    if (!open || !area) return;
    area.focus();
    area.style.height = 'auto';
    area.style.height = `${area.scrollHeight}px`;
  }, [open]);

  const current = saved ?? value;

  if (!editing) return children ?? <Tag>{current}</Tag>;

  async function commit() {
    if (draft === current) {
      setOpen(false);
      return;
    }
    setStatus('saving');
    try {
      await saveBuildText(buildId, path, draft);
      setSaved(draft);
      setStatus('saved');
      setOpen(false);
      setTimeout(() => setStatus(null), 1500);
    } catch (err) {
      setStatus('error: ' + err.message);
    }
  }

  function abandon() {
    setDraft(current);
    setOpen(false);
  }

  const errorNote = typeof status === 'string' && status.startsWith('error') && (
    <span className="editable-text-status error">{status}</span>
  );

  if (!open) {
    return (
      <Tag
        className="editable-text"
        onClick={() => {
          setDraft(current);
          setOpen(true);
        }}
      >
        <span className="editable-text-value">{current}</span>
        <span className="editable-text-hint" aria-hidden="true">
          ✎
        </span>
        {status === 'saved' && <span className="editable-text-status saved">saved</span>}
        {errorNote}
      </Tag>
    );
  }

  return (
    <Tag className="editable-text editing">
      <textarea
        ref={areaRef}
        className="editable-text-area"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          e.target.style.height = 'auto';
          e.target.style.height = `${e.target.scrollHeight}px`;
        }}
        onKeyDown={(e) => {
          // Ctrl/Cmd+Enter saves, Escape abandons. Plain Enter inserts a
          // newline, because these fields are genuinely multi-paragraph.
          if (e.key === 'Escape') abandon();
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) commit();
        }}
      />
      <span className="editable-text-actions">
        <button type="button" className="editable-text-save" onClick={commit} disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="editable-text-cancel" onClick={abandon}>
          Cancel
        </button>
        <span className="editable-text-kbd">Ctrl+Enter to save · Esc to cancel</span>
        {errorNote}
      </span>
    </Tag>
  );
}
