import { Role } from 'rhachet';

export const ROLE_MECHANIC: Role = Role.build({
  slug: 'mechanic',
  name: 'Mechanic',
  purpose: 'write code',
  readme: { uri: `${__dirname}/readme.md` },
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
