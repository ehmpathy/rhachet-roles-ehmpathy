import { Role } from 'rhachet';

/**
 * .what = the mechanic role definition
 * .why = defines briefs, skills, inits, and hooks for the mechanic
 */
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
  hooks: {
    onBrain: {
      onBoot: [
        {
          command:
            './node_modules/.bin/rhachet run --repo ehmpathy --role mechanic --init claude.hooks/sessionstart.notify-permissions',
          timeout: 'PT5S',
        },
        {
          command:
            './node_modules/.bin/rhachet roles boot --repo .this --role any --if-present',
          timeout: 'PT60S',
        },
        {
          command:
            './node_modules/.bin/rhachet roles boot --repo ehmpathy --role mechanic',
          timeout: 'PT60S',
        },
      ],
      onTool: [
        {
          command:
            './node_modules/.bin/rhachet run --repo ehmpathy --role mechanic --init claude.hooks/pretooluse.forbid-stderr-redirect',
          timeout: 'PT5S',
          filter: { what: 'Bash', when: 'before' },
        },
        {
          command:
            './node_modules/.bin/rhachet run --repo ehmpathy --role mechanic --init claude.hooks/pretooluse.forbid-terms.gerunds',
          timeout: 'PT5S',
          filter: { what: 'Write|Edit', when: 'before' },
        },
        {
          command:
            './node_modules/.bin/rhachet run --repo ehmpathy --role mechanic --init claude.hooks/pretooluse.forbid-terms.blocklist',
          timeout: 'PT5S',
          filter: { what: 'Write|Edit', when: 'before' },
        },
        {
          command:
            './node_modules/.bin/rhachet run --repo ehmpathy --role mechanic --init claude.hooks/pretooluse.check-permissions',
          timeout: 'PT5S',
          filter: { what: 'Bash', when: 'before' },
        },
      ],
      onStop: [
        {
          command: 'pnpm run --if-present fix',
          timeout: 'PT30S',
        },
      ],
    },
  },
});
