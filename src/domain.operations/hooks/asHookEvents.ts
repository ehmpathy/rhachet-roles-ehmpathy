import { isBashInvokedCommand } from './isBashInvokedCommand';

/**
 * .what = the distinct event keys under which the given bash-invoked hooks are registered
 * .why = the wrapper-drop rewrote hooks at THREE event keys, and an assertion
 *        that walked `PreToolUse` alone could see only one of them. so a control
 *        is owed that the walk spans more than one key — and the control must
 *        read the axis it guards.
 *
 * 🔴 .note = the axis is the EVENT KEY, never the filename. a control keyed on
 *            "some mechanic hook is not named pretooluse.*" stays GREEN under a
 *            staged regression, because `posttooluse.guardBorder.onWebfetch.sh`
 *            is registered UNDER the PreToolUse key despite its name. ⇒ a
 *            control must read the axis it guards, never a stand-in that
 *            usually agrees with it.
 *
 * .note = it filters ENTRIES rather than commands, since it needs `entry.event`
 *         alongside the `bash ` tell. that is why `isBashInvokedCommand` is a
 *         leaf of its own rather than folded into the path extractor.
 */
export const asHookEvents = (input: {
  hooks: { command: string; event: string }[];
}): Set<string> =>
  new Set(
    input.hooks
      .filter((entry) => isBashInvokedCommand({ command: entry.command }))
      .map((entry) => entry.event),
  );
