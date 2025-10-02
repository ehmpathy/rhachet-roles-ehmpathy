import { Role, RoleTrait } from 'rhachet';

import { getBhrainBrief } from '../bhrain/getBhrainBrief';
import { getMechanicBrief } from '../mechanic/getMechanicBrief';
import { SKILL_COMMANDPLAN } from './commandPlan/stepCommandPlan.skill';

export const ROLE_COMMANDER = Role.build({
  slug: 'commander',
  name: 'Commander',
  purpose: 'command the terminal',
  readme: `
## 🐧 Commander

a helpful terminal commander, at your service
- plan shell commands to achieve your goals
- exec shell commands on your behalf
- achive to plan and exec, in one operation
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
  skills: [SKILL_COMMANDPLAN],
});
