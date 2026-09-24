import { isBashInvokedCommand } from './isBashInvokedCommand';

/**
 * .what = of the given hook commands, the executable path each `bash `-invoked
 *         one names
 * .why = a hook command is either `bash <ported path>` or a `rhachet roles boot`
 *        call. two separate assertions grade the FIRST kind — one pins the path's
 *        shape, one pins that the file is on disk — and both must first agree on
 *        which commands qualify and where the path starts.
 *
 * 🔴 .why a shared leaf = the two back halves legitimately differ — a shape check
 *         may not touch the filesystem (`rule.forbid.unit.remote-boundaries`) and an
 *         existence check must — but the FRONT half is one piece of domain knowledge.
 *         a desync in it is SILENT: both assertions filter on `bash `, so a command
 *         that stops to match is dropped from BOTH and each passes VACUOUSLY.
 *
 * .note = the tell itself is `isBashInvokedCommand`, a leaf of its own, because a
 *         THIRD consumer needs it without the path — the multi-event-key control
 *         filters entries and keeps `entry.event`.
 *
 * ⚠️ .note = the path is the FIRST whitespace-delimited token after the prefix, so a
 *            command that carries args yields the path alone. the whole remainder
 *            would make this an accidental no-args assertion too; what a hook is
 *            passed is not a path defect.
 */
export const asBashInvokedPaths = (input: { commands: string[] }): string[] =>
  input.commands
    .filter((command) => isBashInvokedCommand({ command }))
    .map((command) => command.replace(/^bash\s+/, '').split(/\s+/)[0]!);
