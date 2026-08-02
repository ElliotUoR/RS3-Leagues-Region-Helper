import { useState } from 'react';

// A password `<input>` with a Show/Hide toggle, shared by CreateBuildPage's
// publish-confirmation password step and EditBuildPage's password-login
// fallback - both need the same "type a password, optionally reveal it"
// control. Not a `type="text"` field with manual masking: leaning on the
// browser's own `type="password"`/`type="text"` swap keeps password manager
// integration, autofill styling and paste behaviour all working normally.
export default function PasswordField({ id, value, onChange, placeholder, disabled, autoFocus }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        className="password-field-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        autoComplete="off"
      />
      <button
        type="button"
        className="password-field-toggle"
        onClick={() => setVisible((prev) => !prev)}
        disabled={disabled}
        tabIndex={-1}
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}
