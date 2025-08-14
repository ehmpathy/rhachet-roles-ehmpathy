import { Role, RoleTrait } from 'rhachet';

import { SKILL_ARTICULATE } from './brief.articulate/stepArticulate.skill';
import { getBhrainBrief } from './getBhrainBrief';
import { SKILL_ENQUESTION } from './khue.enquestion/stepEnquestion.skill';
import { SKILL_PONDER } from './khue.ponder/stepPonder.skill';

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
    SKILL_PONDER,
    SKILL_ENQUESTION,
    SKILL_ARTICULATE,
  ],
});
