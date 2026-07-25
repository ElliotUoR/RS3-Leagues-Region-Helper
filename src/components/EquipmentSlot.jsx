import RetryImage from './RetryImage';

// `miniIcon`, when given, overlays a small badge (e.g. the Essence of
// Finality necklace's own icon) in the corner of the slotted item's icon -
// used by the EOF pseudo-slot to show which necklace a slotted weapon's
// spirit belongs to.
export default function EquipmentSlot({ slotId, label, item, isActive, onSelect, disabled, miniIcon }) {
  const classes = [
    'equip-slot',
    isActive ? 'active' : '',
    disabled ? 'disabled' : '',
    item ? 'filled' : '',
  ]
    .filter(Boolean)
    .join(' ');

  let title = label;
  if (disabled) title = `${label} (blocked by two-handed weapon)`;
  else if (item) title = item.name;

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

  return (
    <button
      type="button"
      className={classes}
      style={{ gridArea: slotId }}
      onClick={() => onSelect(slotId)}
      disabled={disabled}
      title={title}
    >
      {content}
    </button>
  );
}
