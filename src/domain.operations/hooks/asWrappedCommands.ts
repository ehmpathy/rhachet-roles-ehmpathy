/**
 * .what = of the given hook commands, the ones that still reach an init through
 *         the `rhachet run --init` wrapper
 * .why = the wrapper costs ~10 forks plus a bun runner boot per invocation, paid
 *        on every tool call that matches the hook. lever B removed it from all 14
 *        init hooks; this names the tell so a re-stamp cannot restore it quietly.
 *
 * 🔴 .note = the tell is `rhachet run` TOGETHER WITH `--init`, and the two tokens
 *            are NOT adjacent — the real command reads
 *            `rhachet run --repo X --role Y --init Z`. a naive
 *            `includes('rhachet run --init')` matches no command at all and
 *            passes vacuously, which is a clamp with no teeth.
 *
 * .note = `rhachet roles boot` is deliberately NOT caught: it runs real TS through
 *         the runner, which is what the runner exists for. an init hook carries
 *         `--init`; a boot command does not.
 *
 * 🔴 .why a shared leaf = this predicate is asserted from three places — the unit
 *         test over `ROLE_MECHANIC`, and the reachability test over both the
 *         generated registry and the committed `.claude/settings.json`. it was
 *         restated inline at the unit call site, so the two-token tell and its
 *         boot carve-out lived in two files and no test could observe them drift
 *         apart. one leaf ⇒ a fix to the tell lands everywhere.
 */
export const asWrappedCommands = (input: { commands: string[] }): string[] =>
  input.commands.filter(
    (command) => command.includes('rhachet run') && command.includes('--init'),
  );
