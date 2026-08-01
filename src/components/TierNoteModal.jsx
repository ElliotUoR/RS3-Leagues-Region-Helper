import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// Edits one tier list entry's tooltip, opened by right-clicking that entry
// while the list is in customise mode (localhost only - see TierList.jsx).
//
// Seeded from the note as it currently stands rather than starting blank: the
// point is usually to adjust wording, and retyping a 300-character note from
// memory to fix one clause is not editing, it is rewriting.
//
// Nothing is written to disk here. It hands the new text back to TierList,
// which holds every pending change until Save - so an accidental edit is
// undone by unticking Customise, exactly like a drag is.
export default function TierNoteModal({ entry, onCancel, onApply }) {
  const [text, setText] = useState(entry.note ?? '');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  return createPortal(
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-panel tier-note-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>Tooltip - {entry.name}</h2>
          <button type="button" className="modal-close" onClick={onCancel} aria-label="Close">
            &times;
          </button>
        </div>
        <p className="tier-note-modal-hint">
          Shown when this entry is tapped or hovered. Saved into <code>blessingBuilds.js</code> when you press
          Save on the tier list.
        </p>
        <textarea
          className="tier-note-modal-input"
          value={text}
          rows={8}
          autoFocus
          onChange={(event) => setText(event.target.value)}
        />
        <div className="tier-note-modal-actions">
          <button type="button" className="tier-customise-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="tier-customise-save" onClick={() => onApply(text.trim())}>
            Apply
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
