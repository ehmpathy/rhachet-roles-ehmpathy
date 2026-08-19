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
  keyrack: { uri: `${__dirname}/keyrack.yml` },
  boot: { uri: `${__dirname}/boot.yml` },
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
        {
          command:
            './node_modules/.bin/rhachet run --repo ehmpathy --role mechanic --init claude.hooks/postcompact.trust-but-verify',
          timeout: 'PT30S',
          filter: { what: 'PostCompact' },
        },
      ],
      onTool: [
        {
          command:
            './node_modules/.bin/rhachet run --repo ehmpathy --role mechanic --init claude.hooks/pretooluse.forbid-test-background',
          timeout: 'PT5S',
          filter: { what: 'Bash', when: 'before' },
        },
        {
          command:
            './node_modules/.bin/rhachet run --repo ehmpathy --role mechanic --init claude.hooks/pretooluse.forbid-sedreplace-special-chars',
          timeout: 'PT5S',
          filter: { what: 'Bash', when: 'before' },
        },
        {
          command:
            './node_modules/.bin/rhachet run --repo ehmpathy --role mechanic --init claude.hooks/pretooluse.forbid-suspicious-shell-syntax',
          timeout: 'PT5S',
          filter: { what: 'Bash', when: 'before' },
        },
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
        {
          command:
            './node_modules/.bin/rhachet run --repo ehmpathy --role mechanic --init claude.hooks/pretooluse.forbid-tmp-writes',
          timeout: 'PT5S',
          filter: { what: 'Write|Edit|Read|Bash', when: 'before' },
        },
        {
          command:
            './node_modules/.bin/rhachet run --repo ehmpathy --role mechanic --init claude.hooks/pretooluse.forbid-shouted-readme',
          timeout: 'PT5S',
          filter: { what: 'Write|Edit|Read', when: 'before' },
        },
        // .why = mechanic only, exactly like every other tool-use blocker
        //        above it (forbid-tmp-writes, forbid-shouted-readme,
        //        forbid-terms.*, check-permissions). a gate registered
        //        differently from its whole family is a surprise to the next
        //        reader and a second convention to maintain.
        //
        // .note = getRoleRegistry.test.ts asserts this BOTH ways — that the
        //         mechanic carries it, and that no other role does. the second
        //         half is what decays silently, since a copy onto another role
        //         would otherwise pass every test in the repo.
        {
          command:
            './node_modules/.bin/rhachet run --repo ehmpathy --role mechanic --init claude.hooks/pretooluse.forbid-cross-repo-access',
          timeout: 'PT5S',
          filter: {
            what: 'Write|Edit|Read|NotebookEdit|Grep|Glob|Bash',
            when: 'before',
          },
        },
        {
          command:
            './node_modules/.bin/rhachet run --repo ehmpathy --role mechanic --init claude.hooks/pretooluse.forbid-planmode',
          timeout: 'PT5S',
          filter: { what: 'EnterPlanMode', when: 'before' },
        },
        {
          command:
            './node_modules/.bin/rhachet run --repo ehmpathy --role mechanic --init claude.hooks/posttooluse.guardBorder.onWebfetch',
          timeout: 'PT60S',
          filter: { what: 'WebFetch', when: 'after' },
        },
      ],
      // .note = lint onStop removed: 60s blocks session end, too expensive
      // .todo = revisit when brain.hooks.onPush lands
    },
  },
});
