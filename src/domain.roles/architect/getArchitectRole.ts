import { Role } from 'rhachet';

/**
 * .what = the architect role definition
 * .why = defines briefs and hooks for the architect
 */
export const ROLE_ARCHITECT: Role = Role.build({
  slug: 'architect',
  name: 'Architect',
  purpose: 'design system',
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
