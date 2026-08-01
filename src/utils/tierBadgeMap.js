// Which badge renderer each tier list type uses.
//
// Split from components/tierBadges.jsx because that file exports components,
// and exporting a plain object alongside them breaks React Fast Refresh for
// the whole file.
import { BlessingBadges, RelicBadges } from '../components/tierBadges';

export const TIER_LIST_BADGES = { blessings: BlessingBadges, relics: RelicBadges };
