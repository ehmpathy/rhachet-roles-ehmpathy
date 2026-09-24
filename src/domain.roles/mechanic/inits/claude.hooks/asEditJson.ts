/**
 * .what = the Edit payload shape, whose scanned field is new_string
 * .why = a hook scans ONLY new_string on an Edit, so old_string must be a real
 *        peer field rather than a stub — a case that proves a term present only
 *        in old_string is permitted needs both fields to differ.
 *
 * .note = shared by the two hook suites, which need it byte-identical.
 *         `oldString` and `newString` are the same type, so the named-arg form
 *         carries weight: a positional swap would invert the very asymmetry the
 *         old_string cases exist to establish (rule.forbid.positional-args).
 */
export const asEditJson = (input: {
  filePath: string;
  oldString: string;
  newString: string;
}): {
  tool_name: string;
  tool_input: { file_path: string; old_string: string; new_string: string };
} => ({
  tool_name: 'Edit',
  tool_input: {
    file_path: input.filePath,
    old_string: input.oldString,
    new_string: input.newString,
  },
});
