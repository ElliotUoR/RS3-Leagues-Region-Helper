// Name -> reference-entry maps for the things a build stores by name
// (blessings, league relics, Arch relics). Built once at module load: all of
// it is static data that never changes at runtime, so there is nothing to
// memoise per render.
//
// Their own module rather than living next to the components that use them
// because two components in two files need the same maps, and exporting
// non-components alongside a component breaks React Fast Refresh for that file.
import { BLESSINGS, GOD_TIER_BLESSINGS } from './blessings';
import { LEAGUE_RELICS } from './leagueRelics';
import { RELICS } from './relics';

const byName = (list) => new Map(list.map((entry) => [entry.name, entry]));

export const BLESSING_BY_NAME = byName([...BLESSINGS, ...GOD_TIER_BLESSINGS]);
export const LEAGUE_RELIC_BY_NAME = byName(LEAGUE_RELICS);
export const ARCH_RELIC_BY_NAME = byName(RELICS);
