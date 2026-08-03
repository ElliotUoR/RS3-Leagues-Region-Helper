import { useEffect } from 'react';
import { createPortal } from 'react-dom';

// A confirm dialog for destructive actions, in the site's own modal styling
// rather than window.confirm.
//
// It exists because My Build's Clear button empties FIVE persisted selections
// at once - regions, league relics, Arch relics, blessings and every style's
// gear - which is a great deal to lose to a misclick, and a browser confirm
// cannot list what is about to go. `items` renders that list, so the dialog
// states the actual cost rather than asking "are you sure?" about nothing in
// particular.
//
// Portal-rendered and Escape-closable like the other modals here; the overlay
// click closes, and clicks inside it are stopped from reaching that handler.
export default function ConfirmModal({
  title,
  body,
  items = [],
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onClose,
}) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel confirm-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        {body && <p className="confirm-modal-body">{body}</p>}

        {items.length > 0 && (
          <ul className="confirm-modal-items">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}

        <div className="confirm-modal-actions">
          {/* Cancel first and styled as the plain option: the destructive
              button should never be the one a hurried click lands on by
              muscle memory from the previous dialog. */}
          <button type="button" className="confirm-modal-cancel" onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className="confirm-modal-confirm"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
