import { Role } from 'rhachet';

import { SKILL_CODE_PROPOSE } from './skills/getSkillCodePropose';
import { SKILL_WRITE } from './write/loopWrite.skill';

export const ROLE_MECHANIC = Role.build({
  slug: 'mechanic',
  name: 'Mechanic',
  purpose: 'write code',
  readme: `
## 🔧 Mechanic

- **scale**: repo-level, implementation detail
- **focus**: maintainability, observability, readability
- **maximizes**: empathy for the 3am on-call engineer

Used to write and revise the actual logic that runs the system.
  `.trim(),
  traits: [],
  skills: [SKILL_WRITE, SKILL_CODE_PROPOSE],
});
