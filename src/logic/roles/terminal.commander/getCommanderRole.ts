import { Role, RoleTrait } from 'rhachet';

import { getBhrainBrief } from '../bhrain/getBhrainBrief';
import { getMechanicBrief } from '../mechanic/getMechanicBrief';
import { SKILL_COMMAND_EXEC } from './command.exec/stepExecCommand.skill';
import { SKILL_COMMAND_PLAN } from './command.plan/stepPlanCommand.skill';

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
  skills: [SKILL_COMMAND_PLAN, SKILL_COMMAND_EXEC],
  briefs: { dir: __dirname + '/.briefs' },
});
