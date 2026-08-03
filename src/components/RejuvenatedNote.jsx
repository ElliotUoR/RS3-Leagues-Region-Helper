import { REJUVENATED_RELIC, doubledTier } from '../data/leagueRelicPicks';

// Explains a build holding two relics from the same tier.
//
// That is only legal because Rejuvenated was taken, and without saying so the
// pair reads as a data error - the rest of the site has told the reader all
// along that a tier holds one. Renders nothing for the overwhelming majority of
// builds, which have no doubled tier at all.
export default function RejuvenatedNote({ relics = [] }) {
  if (!relics.includes(REJUVENATED_RELIC)) return null;
  const tier = doubledTier(relics);
  return (
    <p className="rejuvenated-note">
      <span className="rejuvenated-note-mark" aria-hidden="true">
        ✦
      </span>
      {tier == null
        ? 'Rejuvenated grants an extra relic from another tier - unspent in this build.'
        : `Rejuvenated grants the second Tier ${tier} relic.`}
    </p>
  );
}
