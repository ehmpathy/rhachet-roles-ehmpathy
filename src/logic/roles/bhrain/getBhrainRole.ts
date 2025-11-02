import { Role, RoleTrait } from 'rhachet';

import { getMechanicBrief } from '../mechanic/getMechanicBrief';
import { SKILL_ARTICULATE } from './brief.articulate/stepArticulate.skill';
import { SKILL_CATALOGIZE } from './brief.catalogize/stepCatalogize.skill';
import { SKILL_DEMONSTRATE } from './brief.demonstrate/stepDemonstrate.skill';
import { getBhrainBrief } from './getBhrainBrief';
import { SKILL_CLUSTER } from './khue.cluster/stepCluster.skill';
import { SKILL_DIVERGE } from './khue.diverge/stepDiverge.skill';
import { SKILL_INSTANTIATE } from './khue.instantiate/stepInstantiate.skill';
import { SKILL_TRIAGE } from './khue.triage/stepTriage.skill';

export const ROLE_BHRAIN = Role.build({
  slug: 'bhrain',
  name: 'Bhrain',
  purpose: 'think',
  readme: `
## 🧠 Bhrain

thought tactics; intent = be composed into other roles
  `.trim(),
  traits: [
    RoleTrait.build({
      slug: 'ocd',
      readme: 'obsesses over structure, precision, and clarity',
      brief: getBhrainBrief('trait.ocd.md'),
    }),
    RoleTrait.build({
      slug: 'vibes',
      readme: 'careful about the aesthetics of their output',
      brief: getMechanicBrief('style.words.lowercase.md'),
    }),
  ],
  skills: [
    // khue primitives
    SKILL_DIVERGE,
    SKILL_CLUSTER,
    SKILL_TRIAGE,
    SKILL_INSTANTIATE,

    // know primitives
    SKILL_ARTICULATE,
    SKILL_DEMONSTRATE,
    SKILL_CATALOGIZE,

    // goal primitives
    // SKILL_INTERPRET; ask -> Focus[Goal]
  ],
  briefs: { dir: __dirname + '/.briefs' },
});
