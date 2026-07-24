import RetryImage from './RetryImage';

export default function EquipmentSlot({ slotId, label, item, isActive, onSelect, disabled }) {
  const classes = [
    'equip-slot',
    isActive ? 'active' : '',
    disabled ? 'disabled' : '',
    item ? 'filled' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      style={{ gridArea: slotId }}
      onClick={() => onSelect(slotId)}
      disabled={disabled}
      title={disabled ? `${label} (blocked by two-handed weapon)` : item ? item.name : label}
    >
      {item ? (
        <RetryImage src={item.icon} alt={item.name} loading="eager" />
      ) : (
        <span className="equip-slot-label">{label}</span>
      )}
    </button>
  );
}
