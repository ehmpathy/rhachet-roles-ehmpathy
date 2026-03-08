import { Role } from 'rhachet';

export const ROLE_ERGONOMIST: Role = Role.build({
  slug: 'ergonomist',
  name: 'Ergonomist',
  purpose: 'humanize experiences',
  readme: { uri: `${__dirname}/readme.md` },
  traits: [],
  skills: {
    dirs: [],
    refs: [],
  },
  briefs: {
    dirs: [{ uri: __dirname + '/briefs' }],
  },
});
