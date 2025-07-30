import { Role, RoleTrait } from 'rhachet';

import { getBhrainBrief } from './getBhrainBrief';

// import { SKILL_INTERPRET } from './primitive.strategic.atomic/interpret/stepInterpret.skill';

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
    //SKILL_INTERPRET
  ],
});
