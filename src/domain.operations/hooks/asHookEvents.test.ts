import { given, then, when } from 'test-fns';

import { asHookEvents } from './asHookEvents';

/**
 * .what = unit coverage for the multi-event-key control
 * .why = a control keyed on the FILENAME — "some mechanic hook is not named
 *        pretooluse.*" — stays GREEN under a staged regression, because
 *        `posttooluse.guardBorder.onWebfetch.sh` is registered UNDER the
 *        PreToolUse key despite its name.
 *
 * ⇒ a control must read the AXIS it guards, never a stand-in that usually agrees
 *   with it. [case2] is that lesson as a test: a set of hooks whose FILENAMES
 *   span two prefixes while their EVENT KEYS span one. a filename-keyed control
 *   reads 2 there and passes; this leaf reads 1 and the caller fails red.
 */
describe('asHookEvents', () => {
  const PORTED = (slug: string): string =>
    `bash .agent/repo=ehmpathy/role=mechanic/inits/claude.hooks/${slug}.sh`;

  given('[case1] bash-invoked hooks across three event keys', () => {
    when('[t0] the entries are walked', () => {
      then('all three keys come back', () => {
        expect(
          asHookEvents({
            hooks: [
              {
                command: PORTED('pretooluse.forbid-terms.gerunds'),
                event: 'PreToolUse',
              },
              {
                command: PORTED('sessionstart.notify-permissions'),
                event: 'SessionStart',
              },
              {
                command: PORTED('postcompact.trust-but-verify'),
                event: 'PostCompact',
              },
            ],
          }),
        ).toEqual(new Set(['PreToolUse', 'SessionStart', 'PostCompact']));
      });
    });
  });

  given('[case2] filenames that span two prefixes, under ONE event key', () => {
    // 🔴 THE case. this is the real registry shape that defeated the first
    //    control: `posttooluse.guardBorder.onWebfetch.sh` is named for one event
    //    and registered under another.
    when('[t0] the entries are walked', () => {
      then('exactly ONE key comes back — the axis, never the name', () => {
        expect(
          asHookEvents({
            hooks: [
              {
                command: PORTED('pretooluse.forbid-terms.gerunds'),
                event: 'PreToolUse',
              },
              {
                command: PORTED('posttooluse.guardBorder.onWebfetch'),
                event: 'PreToolUse',
              },
            ],
          }),
        ).toEqual(new Set(['PreToolUse']));
      });
    });
  });

  given('[case3] wrapped commands mixed in with bash-invoked ones', () => {
    when('[t0] the entries are walked', () => {
      then('only the bash-invoked hooks contribute their key', () => {
        // the control grades the hooks LEVER B rewrote. a boot command's event
        // key must not inflate the span, or the control reports coverage it
        // never earned.
        expect(
          asHookEvents({
            hooks: [
              {
                command: PORTED('pretooluse.forbid-terms.gerunds'),
                event: 'PreToolUse',
              },
              {
                command:
                  './node_modules/.bin/rhachet roles boot --repo ehmpathy --role mechanic',
                event: 'SessionStart',
              },
            ],
          }),
        ).toEqual(new Set(['PreToolUse']));
      });
    });
  });

  given('[case4] no bash-invoked hook at all', () => {
    when('[t0] the entries are walked', () => {
      then('the set is empty', () => {
        // ⚠️ the vacuous state. a caller that asserts `size > 1` must guard
        //    against this arrival as a silent 0 rather than a red 1.
        expect(
          asHookEvents({
            hooks: [
              {
                command:
                  './node_modules/.bin/rhachet roles boot --repo ehmpathy --role mechanic',
                event: 'SessionStart',
              },
            ],
          }),
        ).toEqual(new Set());
      });
    });
  });
});
