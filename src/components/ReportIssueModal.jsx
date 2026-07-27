import { useEffect, useState } from 'react';
import { submitIssueReport } from '../utils/api';
import { REGIONS } from '../data/regions';
import { ABILITIES } from '../data/abilities';
import { RELICS } from '../data/relics';
import { SPELLBOOK_GROUPS, PRAYER_GROUPS } from '../data/spellbooks';
import { COMBAT_STYLES, GEAR_SLOTS, GEAR } from '../data/gear';

const MIN_LENGTH = 10;
const MAX_LENGTH = 5000;

const ISSUE_TYPES = [
  { value: 'missing', label: 'Missing data' },
  { value: 'incorrect', label: 'Incorrect data' },
  { value: 'wrongRegion', label: 'Wrong region tags' },
  { value: 'bug', label: 'Bug / website issue' },
  { value: 'other', label: 'Other' },
];

// Only these three issue types are about something on a specific page - a
// bug report or "other" note doesn't need the page/detail cascade at all.
const NEEDS_PAGE = new Set(['missing', 'incorrect', 'wrongRegion']);

const DEFAULT_PLACEHOLDER = 'What went wrong? Include what you expected to happen.';
const PLACEHOLDER_BY_ISSUE_TYPE = {
  wrongRegion: 'What regions are wrong? What should the correct regions be?',
  missing: 'What data is missing?',
  incorrect: 'What data is incorrect? What is the correct data?',
};

const PAGES = [
  { value: 'regions', label: 'Regions' },
  { value: 'gear', label: 'Gear Planner' },
  { value: 'abilities', label: 'Abilities' },
  { value: 'relics', label: 'Relics' },
  { value: 'spellbook', label: 'Spellbook' },
  { value: 'prayer', label: 'Prayer' },
];

const SLOT_LABELS = {
  weapon: 'Weapon',
  offhand: 'Off-hand',
  ammo: 'Ammo',
  head: 'Head',
  torso: 'Torso',
  legs: 'Legs',
  hands: 'Hands',
  feet: 'Feet',
  back: 'Back',
  neck: 'Neck',
  ring: 'Ring',
  pocket: 'Pocket',
};

const STYLE_LABELS = {
  melee: 'Melee',
  ranged: 'Ranged',
  magic: 'Magic',
  necromancy: 'Necromancy',
};

// Flattens a spellbook/prayer group list (parent + related cards) into a
// flat list of names - same shape used to render the panels themselves, but
// read here purely so the dropdown always mirrors whatever's actually on
// the page (see the file-level note in spellbooks.js).
function flattenGroups(groups) {
  return groups.flatMap((group) => [group.parent.name, ...(group.related ?? []).map((card) => card.name)]);
}

function detailOptionsFor(page) {
  switch (page) {
    case 'regions':
      return Object.values(REGIONS).map((region) => region.name);
    case 'abilities':
      return ABILITIES.map((ability) => ability.name);
    case 'relics':
      return RELICS.map((relic) => relic.name);
    case 'spellbook':
      return flattenGroups(SPELLBOOK_GROUPS);
    case 'prayer':
      return flattenGroups(PRAYER_GROUPS);
    default:
      return [];
  }
}

const initialState = {
  issueType: '',
  page: '',
  detail: 'general',
  gearStyle: COMBAT_STYLES[0],
  gearSlot: 'all',
  gearItem: 'all',
  message: '',
};

// Depends on the optional backend (docs/deployment.md) - on GitHub Pages, or
// before the backend is deployed, /api/report-issue simply doesn't exist, so
// submitting always fails there. That's surfaced as a normal inline error
// rather than hidden, since a visitor who bothered to write a report
// deserves to know it didn't go anywhere.
//
// All the dropdown options below are derived directly from the same data
// files each page renders from (regions.js, abilities.js, relics.js,
// spellbooks.js, gear.js) rather than a hardcoded copy, so adding a new
// region/ability/relic/gear item automatically shows up here too.
export default function ReportIssueModal({ open, onClose }) {
  const [form, setForm] = useState(initialState);
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error

  useEffect(() => {
    if (!open) return undefined;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setForm(initialState);
      setStatus('idle');
    }
  }, [open]);

  if (!open) return null;

  function update(patch) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function handleIssueTypeChange(value) {
    update({ issueType: value, page: '', detail: 'general', gearStyle: COMBAT_STYLES[0], gearSlot: 'all', gearItem: 'all' });
  }

  function handlePageChange(value) {
    update({ page: value, detail: 'general', gearStyle: COMBAT_STYLES[0], gearSlot: 'all', gearItem: 'all' });
  }

  function handleGearStyleChange(value) {
    update({ gearStyle: value, gearSlot: 'all', gearItem: 'all' });
  }

  function handleGearSlotChange(value) {
    update({ gearSlot: value, gearItem: 'all' });
  }

  const needsPage = NEEDS_PAGE.has(form.issueType);
  const detailOptions = needsPage && form.page && form.page !== 'gear' ? detailOptionsFor(form.page) : [];
  const gearItemOptions =
    needsPage && form.page === 'gear' && form.gearSlot !== 'all'
      ? (GEAR[form.gearStyle]?.[form.gearSlot] ?? []).map((item) => item.name)
      : [];

  const trimmedLength = form.message.trim().length;
  const tooShort = trimmedLength > 0 && trimmedLength < MIN_LENGTH;
  const canSubmit =
    form.issueType !== '' && (!needsPage || form.page !== '') && trimmedLength >= MIN_LENGTH && status !== 'sending';

  function composeBody() {
    const typeLabel = ISSUE_TYPES.find((t) => t.value === form.issueType)?.label ?? form.issueType;
    const lines = [`Issue type: ${typeLabel}`];

    if (needsPage && form.page) {
      const pageLabel = PAGES.find((p) => p.value === form.page)?.label ?? form.page;
      lines.push(`Page: ${pageLabel}`);

      if (form.page === 'gear') {
        lines.push(`Style: ${STYLE_LABELS[form.gearStyle] ?? form.gearStyle}`);
        lines.push(`Slot: ${form.gearSlot === 'all' ? 'All' : (SLOT_LABELS[form.gearSlot] ?? form.gearSlot)}`);
        lines.push(`Item: ${form.gearItem === 'all' ? 'All' : form.gearItem}`);
      } else {
        lines.push(`Detail: ${form.detail === 'general' ? 'General issue' : form.detail}`);
      }
    }

    lines.push('');
    lines.push(form.message.trim());
    return lines.join('\n');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;
    setStatus('sending');
    try {
      await submitIssueReport(composeBody());
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel report-issue-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>Report an issue</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        {status === 'sent' ? (
          <p>Thanks - your report was filed. You can close this now.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="report-issue-field">
              <span>Issue type</span>
              <select value={form.issueType} onChange={(event) => handleIssueTypeChange(event.target.value)}>
                <option value="" disabled>
                  Choose an issue type&hellip;
                </option>
                {ISSUE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>

            {needsPage && (
              <label className="report-issue-field">
                <span>Which page?</span>
                <select value={form.page} onChange={(event) => handlePageChange(event.target.value)}>
                  <option value="" disabled>
                    Choose a page&hellip;
                  </option>
                  {PAGES.map((page) => (
                    <option key={page.value} value={page.value}>
                      {page.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {needsPage && form.page === 'gear' && (
              <>
                <label className="report-issue-field">
                  <span>Style</span>
                  <select value={form.gearStyle} onChange={(event) => handleGearStyleChange(event.target.value)}>
                    {COMBAT_STYLES.map((style) => (
                      <option key={style} value={style}>
                        {STYLE_LABELS[style] ?? style}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="report-issue-field">
                  <span>Slot</span>
                  <select value={form.gearSlot} onChange={(event) => handleGearSlotChange(event.target.value)}>
                    <option value="all">All</option>
                    {GEAR_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        {SLOT_LABELS[slot] ?? slot}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="report-issue-field">
                  <span>Item</span>
                  <select
                    value={form.gearItem}
                    onChange={(event) => update({ gearItem: event.target.value })}
                    disabled={form.gearSlot === 'all'}
                  >
                    <option value="all">All</option>
                    {gearItemOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}

            {needsPage && form.page && form.page !== 'gear' && (
              <label className="report-issue-field">
                <span>What's wrong with?</span>
                <select value={form.detail} onChange={(event) => update({ detail: event.target.value })}>
                  <option value="general">General issue</option>
                  {detailOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="report-issue-field">
              <span>Details</span>
              <textarea
                value={form.message}
                maxLength={MAX_LENGTH}
                placeholder={PLACEHOLDER_BY_ISSUE_TYPE[form.issueType] ?? DEFAULT_PLACEHOLDER}
                onChange={(event) => update({ message: event.target.value })}
                rows={4}
              />
            </label>

            {tooShort && <p className="report-issue-hint">A few more details would help ({MIN_LENGTH} characters minimum).</p>}
            {status === 'error' && (
              <p className="report-issue-hint">
                Couldn't send that just now - this feature needs the site's backend, which may not be live yet.
              </p>
            )}

            <button type="submit" disabled={!canSubmit}>
              {status === 'sending' ? 'Sending…' : 'Submit report'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
