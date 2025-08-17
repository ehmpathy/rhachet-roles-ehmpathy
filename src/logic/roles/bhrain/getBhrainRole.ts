import { Role, RoleTrait } from 'rhachet';

import { SKILL_ARTICULATE } from './brief.articulate/stepArticulate.skill';
import { getBhrainBrief } from './getBhrainBrief';
import { SKILL_DIVERGE } from './khue.diverge/stepDiverge.skill';

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
  ],
  skills: [
    // SKILL_INTERPRET; ask -> Focus[Goal]

    // todo: are these still relevant?
    // SKILL_PONDER,
    // SKILL_ENQUESTION,

    // proven primitives - proven usage showcase
    SKILL_ARTICULATE,
    SKILL_DIVERGE,
  ],
});
