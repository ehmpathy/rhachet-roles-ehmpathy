import { Role } from 'rhachet';

import { SKILL_ENDIALOGUE } from './endialogue/stepEndialogue.skill';

export const ROLE_BHRAIN = Role.build({
  slug: 'bhrain',
  name: 'Bhrain',
  purpose: 'think',
  readme: `

## 🧠 Bhrain

thought tactics; intent = be composed into other roles
  `.trim(),
  traits: [],
  skills: [SKILL_ENDIALOGUE],
});
