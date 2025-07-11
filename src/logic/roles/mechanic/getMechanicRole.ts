import { GStitcherOf } from 'rhachet';

import { Role } from '../../../__nonpublished_modules__/rhachet/src/domain/Role';
import { RoleSkill } from '../../../__nonpublished_modules__/rhachet/src/domain/RoleSkill';
import { routeMechanicCodePropose } from './codediff/routeMechanicCodePropose';

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
  skills: [
    RoleSkill.build<RoleSkill<GStitcherOf<typeof routeMechanicCodePropose>>>({
      slug: 'upsert',
      route: routeMechanicCodePropose,
      input: {
        target: {
          char: 't',
          desc: 'the target file or dir to upsert against',
          shape: 'string',
        },
      },
      readme: `
### \`ask -r mechanic -s upsert\`

you can ask the mechanic to upsert the code in a target file or dir
- if it exists, it'll update
- if it doesn't, it'll create


\`\`\`sh
npx rhachet ask -r mechanic -s upsert -t ./path/to/file.ts "your ask"
\`\`\`

\`\`\`sh
npx rhachet ask \
  --role mechanic \
  --skill upsert \
  --target ./path/to/file.ts \
  "your ask"
\`\`\`

once it's self reviewed, it'll ask you for feedback

\`\`\`sh
? have notes? (Use arrow keys)
❯ no notes
  yes notes
\`\`\`

it'll loop until you tell it you have \`no notes\`
    `.trim(),
    }),
  ],
});
