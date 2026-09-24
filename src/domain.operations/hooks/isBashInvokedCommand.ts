/**
 * .what = whether a hook command invokes a ported `.sh` directly, rather than
 *         through the `rhachet roles boot` runner
 * .why = three separate assertions need this one tell — a path-existence check, a
 *        path-shape check, and an event-key control.
 *
 * 🔴 .note = a desync in this tell is SILENT, which is why it is a leaf rather than a
 *            copy at each call site. every consumer FILTERS on it, so a command that
 *            stops to match is dropped from ALL of them and each assertion then passes
 *            VACUOUSLY over a smaller set. ⇒ a divergence here does not turn a test red;
 *            it turns three tests hollow.
 */
export const isBashInvokedCommand = (input: { command: string }): boolean =>
  input.command.startsWith('bash ');
