import { Role } from 'rhachet';

export const ROLE_ARCHITECT: Role = Role.build({
  slug: 'architect',
  name: 'Architect',
  purpose: 'design system',
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
