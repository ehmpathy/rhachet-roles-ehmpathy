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
  hooks: {
    onBrain: {
      onBoot: [
        {
          command:
            './node_modules/.bin/rhachet roles boot --repo ehmpathy --role architect',
          timeout: 'PT60S',
        },
      ],
    },
  },
});
