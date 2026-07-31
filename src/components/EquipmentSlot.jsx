import RetryImage from './RetryImage';
import GearTooltip from './GearTooltip';

// `miniIcon`, when given, overlays a small badge (e.g. the Essence of
// Finality necklace's own icon) in the corner of the slotted item's icon -
// used by the EOF pseudo-slot to show which necklace a slotted weapon's
// spirit belongs to.
//
// `readOnly` renders the slot as a plain <div> instead of a <button> - used
// by ReadOnlyLoadout on the Build Guides page, where the loadouts are fixed
// illustrations rather than something to edit. A <button> there would add a
// dozen useless tab stops per loadout (and several loadouts render at once),
// and its title would wrongly tell the user to right-click to unequip.
//
// Passing `isUnlocked` opts the slot into the richer GearTooltip hover card
// (name, region tags, stats) instead of the plain native `title`. The slot is
// always wrapped so the wrapper - not the slot - is the CSS grid item, which
// is why `gridArea` moves onto it: an unwrapped slot and a wrapped one would
// otherwise land in different grid cells.
export default function EquipmentSlot({
  slotId,
  label,
  item,
  isActive,
  onSelect,
  onUnequip,
  disabled,
  miniIcon,
  readOnly,
  isUnlocked,
  style,
  selectedLeagueRelics,
}) {
  const classes = [
    'equip-slot',
    isActive ? 'active' : '',
    disabled ? 'disabled' : '',
    item ? 'filled' : '',
    readOnly ? 'equip-slot-readonly' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const hasHoverCard = Boolean(isUnlocked);

  // The native title is redundant (and duplicates awkwardly) once the hover
  // card is showing the same information in a richer form.
  let title = label;
  if (disabled) title = `${label} (blocked by two-handed weapon)`;
  else if (item && hasHoverCard) title = undefined;
  else if (item && readOnly) title = item.name;
  else if (item) title = `${item.name} (right-click to unequip)`;

  function handleContextMenu(e) {
    e.preventDefault();
    if (!item || disabled) return;
    onUnequip?.(slotId);
  }

  let content = <span className="equip-slot-label">{label}</span>;
  if (item && miniIcon) {
    content = (
      <span className="equip-slot-content">
        <RetryImage src={item.icon} alt={item.name} loading="eager" />
        <RetryImage src={miniIcon} alt="" className="equip-slot-mini-icon" loading="eager" />
      </span>
    );
  } else if (item) {
    content = <RetryImage src={item.icon} alt={item.name} loading="eager" />;
  }

  const slot = readOnly ? (
    <div className={classes} title={title}>
      {content}
    </div>
  ) : (
    <button
      type="button"
      className={classes}
      onClick={() => onSelect(slotId)}
      onContextMenu={handleContextMenu}
      disabled={disabled}
      title={title}
    >
      {content}
    </button>
  );

  if (!hasHoverCard) {
    return (
      <span className="equip-slot-anchor" style={{ gridArea: slotId }}>
        {slot}
      </span>
    );
  }

  return (
    <GearTooltip
      item={item}
      isUnlocked={isUnlocked}
      style={style}
      selectedLeagueRelics={selectedLeagueRelics}
      anchorClassName="equip-slot-anchor"
      anchorStyle={{ gridArea: slotId }}
    >
      {slot}
    </GearTooltip>
  );
}
