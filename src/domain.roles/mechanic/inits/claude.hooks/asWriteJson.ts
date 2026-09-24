/**
 * .what = build the stdin payload claude code hands a PreToolUse hook for a Write
 * .why = named args, never positional — the fields are same-typed strings, so a
 *        positional pair swaps silently (rule.forbid.positional-args)
 *
 * .note = shared by the blocklist and gerunds suites rather than copied into
 *         each. the rule-of-three argument does not reach it: the shape is a
 *         CONTRACT with claude code, so a desync between two copies is a test
 *         that no longer exercises the payload the hook actually receives.
 */
export const asWriteJson = (input: {
  filePath: string;
  content: string;
}): {
  tool_name: string;
  tool_input: { file_path: string; content: string };
} => ({
  tool_name: 'Write',
  tool_input: { file_path: input.filePath, content: input.content },
});
