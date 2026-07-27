import { useEffect, useState } from 'react';

// RS3 Leagues II: Equilibrium's confirmed start time.
const TARGET_DATE = new Date('2026-08-10T11:00:00Z');

function getTimeRemaining() {
  const diff = TARGET_DATE.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
  };
}

function pad(n) {
  return String(n).padStart(2, '0');
}

// Colours match the region map's own colour key (see data/regions.js) - one
// distinct hue per unit, tying the countdown into the same colour language
// as the rest of the Regions page instead of a single flat accent colour.
const UNITS = [
  { key: 'days', label: 'D', color: '#D6B93E' },
  { key: 'hours', label: 'H', color: '#3885C9' },
  { key: 'minutes', label: 'M', color: '#35CC4B' },
  { key: 'seconds', label: 'S', color: '#C53335' },
];

export default function LeagueCountdown() {
  const [remaining, setRemaining] = useState(getTimeRemaining);

  useEffect(() => {
    const interval = setInterval(() => setRemaining(getTimeRemaining()), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="league-countdown">
      <h2 className="league-countdown-heading">⚔️ Leagues II: Equilibrium begins in</h2>
      {remaining ? (
        <div className="league-countdown-units">
          {UNITS.map(({ key, label, color }) => (
            <div key={key} className="league-countdown-unit" style={{ '--unit-color': color }}>
              <span className="league-countdown-value">{pad(remaining[key])}</span>
              <span className="league-countdown-label">{label}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="league-countdown-live">Leagues II: Equilibrium has begun - good luck out there!</p>
      )}
    </div>
  );
}
