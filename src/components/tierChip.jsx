import RetryImage from './RetryImage';

// The inner markup of a tier list chip - icon, name, badges.
//
// Shared by the site's own tier lists (TierList.jsx) and by TierEntryChip -
// the interactive chip the maker and shared lists use - so a user-built list
// looks like the curated ones rather than merely similar: same icon size, same
// badges, same blessing-colour and relic-hue treatment. Only the wrapper
// differs, because those two need drag and a description bubble and the
// curated lists need neither.

export function TierChipContent({ entry, renderBadges }) {
  return (
    <>
      {entry.icon && <RetryImage src={entry.icon} alt="" className="tier-entry-icon" />}
      <span className="tier-entry-name">{entry.name}</span>
      {renderBadges?.(entry)}
      {entry.asterisk && (
        <span className="tier-entry-asterisk" aria-hidden="true">
          *
        </span>
      )}
    </>
  );
}

