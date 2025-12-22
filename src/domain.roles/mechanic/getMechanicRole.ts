import { Role } from 'rhachet';

export const ROLE_MECHANIC: Role = Role.build({
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
  briefs: {
    dirs: { uri: `${__dirname}/briefs` },
  },
  skills: {
    dirs: { uri: `${__dirname}/skills` },
    refs: [],
  },
  inits: {
    dirs: { uri: `${__dirname}/inits` },
    exec: [{ cmd: `${__dirname}/inits/init.claude.sh` }],
  },
});
