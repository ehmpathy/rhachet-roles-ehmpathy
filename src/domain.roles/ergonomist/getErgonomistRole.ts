import { Role } from 'rhachet';

export const ROLE_ERGONOMIST: Role = Role.build({
  slug: 'ergonomist',
  name: 'Ergonomist',
  purpose: 'humanize experiences',
  readme: { uri: `${__dirname}/readme.md` },
  boot: { uri: `${__dirname}/boot.yml` },
  traits: [],
  skills: {
    dirs: [],
    refs: [],
  },
  briefs: {
    dirs: [{ uri: __dirname + '/briefs' }],
  },
  // .note = no self-boot hook. briefs reach a session via the brain dir boot.md render,
  //         and rhachet's `repo introspect` refuses a role that boots itself from a hook
});
