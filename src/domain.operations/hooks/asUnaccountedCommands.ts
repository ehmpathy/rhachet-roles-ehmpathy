import { isBashInvokedCommand } from './isBashInvokedCommand';

/**
 * .what = of the given hook commands, the ones that are NEITHER kind this role registers
 * .why = every command this role registers takes one of exactly two shapes —
 *        `bash <ported path>` for an init hook, or `rhachet roles boot …` for
 *        real TS work. a command that is neither is a shape nobody declared, so
 *        it is the set an assertion wants to find empty.
 *
 * 🔴 .note = the wrapper carve-out is a LITERAL, and it lives here so it lives
 *            ONCE. `rhachet roles boot` stays wrapped deliberately: it is not an
 *            init hook, it runs real TS through the runner, which is what the
 *            runner exists for. an inline copy of that literal would let the
 *            carve-out drift from the rule it carves out of.
 *
 * ⚠️ .note = this reads as a KIND test — "which of the two is it?" — never as a SHAPE
 *            test. whether a bash-invoked path holds its `.sh`-under-the-ported-tree
 *            shape is `asMalformedHookPaths`, a separate claim in a separate assertion.
 *            ⇒ the two must not be fused into one predicate.
 */
export const asUnaccountedCommands = (input: {
  commands: string[];
}): string[] =>
  input.commands.filter(
    (command) =>
      !isBashInvokedCommand({ command }) &&
      !command.startsWith('./node_modules/.bin/rhachet roles boot '),
  );
