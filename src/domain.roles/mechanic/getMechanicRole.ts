import { Role } from 'rhachet';

/**
 * .what = the invocation of one ported init hook, by name
 * .why = the ported base path is ONE piece of domain knowledge — where a role's
 *        inits land in the .agent tree. it was written out in 14 string
 *        literals, so a rename or a re-stamp could desync one of them.
 *
 * 🔴 .note = a desync here is SILENT. a path that does not exist fails with a
 *            non-2 exit, and claude code reads non-2 as "not blocked" — so a
 *            typo RETIRES a gate rather than breaks it. no hook test would
 *            notice: they all invoke the hook by path directly. the reach
 *            assertion in getMechanicRole.hooks-reachable.integration.test.ts
 *            is the only guard that reads this config.
 */
const asHookCommand = (name: string): string =>
  `bash .agent/repo=ehmpathy/role=mechanic/inits/claude.hooks/${name}.sh`;

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
  // .what = every init hook is invoked as `bash <ported path>`, never through
  //         `rhachet run --init`.
  //
  // .why  = the wrapper cost ~10 forks plus a bun runner boot BEFORE the hook
  //         ran at all: `sh -c` -> bin/run's readlink loop -> bin/run.bun ->
  //         the compiled binary -> spawnSync(shell:'/bin/bash') -> the hook.
  //         that bill was paid once per registered hook, per tool call — so a
  //         single Write paid it seven times over. a direct `bash` pays none
  //         of it.
  //
  // .note = each hook derives its own dir from ${BASH_SOURCE[0]}, so it finds
  //         its adjacent .jsonc data files from any cwd. the ported tree holds
  //         every hook AND its data.
  //
  // .note = exit codes pass through unchanged. the wrapper forwarded them too
  //         (executeInit -> InitExecutionError.exitCode -> process.exit), so
  //         a hook's exit 2 still blocks exactly as before.
  //
  // 🔴 .note = a path that does not exist fails with a non-2 exit, and claude
  //            code reads non-2 as "not blocked" — so a typo here silently
  //            RETIRES a gate rather than breaks it. no hook test would
  //            notice: they all invoke the hook by path directly. the reach
  //            assertion in getMechanicRole.hooks-reachable.integration.test.ts
  //            is the only guard that reads this config.
  hooks: {
    onBrain: {
      onBoot: [
        {
          command: asHookCommand('sessionstart.notify-permissions'),
          timeout: 'PT10S',
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
          command: asHookCommand('postcompact.trust-but-verify'),
          timeout: 'PT30S',
          filter: { what: 'PostCompact' },
        },
      ],
      onTool: [
        {
          command: asHookCommand('pretooluse.forbid-test-background'),
          timeout: 'PT10S',
          filter: { what: 'Bash', when: 'before' },
        },
        {
          command: asHookCommand('pretooluse.forbid-sedreplace-special-chars'),
          timeout: 'PT10S',
          filter: { what: 'Bash', when: 'before' },
        },
        {
          command: asHookCommand('pretooluse.forbid-suspicious-shell-syntax'),
          timeout: 'PT10S',
          filter: { what: 'Bash', when: 'before' },
        },
        {
          command: asHookCommand('pretooluse.forbid-stderr-redirect'),
          timeout: 'PT10S',
          filter: { what: 'Bash', when: 'before' },
        },
        // 🟡 .note = `timeout` FAILS OPEN. a PreToolUse hook that exceeds it is
        //            killed, and claude code reads a killed hook as NOT blocked
        //            — so the tool call proceeds, unrefused and undiagnosed.
        //            every timeout on this page carries that contract; it is
        //            called out here because these two gate the highest-cost
        //            path (a tripped write still forks ~25 / ~20 execs, on the
        //            exact runqueue contention this role's fork trim targets).
        //            documented rather than eliminated — a hook with no cap
        //            hangs every tool call on a deadlock, a worse trade. the
        //            two hooks carry the full note; see also
        //            .dream/v2026_09_12.fix.pt5s-hook-timeout-fails-open.md
        {
          command: asHookCommand('pretooluse.forbid-terms.gerunds'),
          timeout: 'PT10S',
          filter: { what: 'Write|Edit', when: 'before' },
        },
        {
          command: asHookCommand('pretooluse.forbid-terms.blocklist'),
          timeout: 'PT10S',
          filter: { what: 'Write|Edit', when: 'before' },
        },
        {
          command: asHookCommand('pretooluse.check-permissions'),
          timeout: 'PT10S',
          filter: { what: 'Bash', when: 'before' },
        },
        {
          command: asHookCommand('pretooluse.forbid-tmp-writes'),
          timeout: 'PT10S',
          filter: { what: 'Write|Edit|Read|Bash', when: 'before' },
        },
        {
          command: asHookCommand('pretooluse.forbid-shouted-readme'),
          timeout: 'PT10S',
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
          command: asHookCommand('pretooluse.forbid-cross-repo-access'),
          timeout: 'PT10S',
          filter: {
            what: 'Write|Edit|Read|NotebookEdit|Grep|Glob|Bash',
            when: 'before',
          },
        },
        {
          command: asHookCommand('pretooluse.forbid-planmode'),
          timeout: 'PT10S',
          filter: { what: 'EnterPlanMode', when: 'before' },
        },
        {
          command: asHookCommand('posttooluse.guardBorder.onWebfetch'),
          timeout: 'PT60S',
          filter: { what: 'WebFetch', when: 'after' },
        },
      ],
      // .note = lint onStop removed: 60s blocks session end, too expensive
      // .todo = revisit when brain.hooks.onPush lands
    },
  },
});
