/**
 * .what = of the given hook paths, the ones that do NOT name a `.sh` under the
 *         ported `claude.hooks` tree
 * .why = lever B points every init hook at a literal path. a path that is absent
 *        fails with a non-2 exit, and claude code reads non-2 as "not blocked" —
 *        so a malformed one silently RETIRES a gate rather than breaks it, in
 *        every repo that ports this role.
 *
 * .note = this grades SHAPE only. that the file is on disk is a separate claim, graded
 *         by `asAbsentHookPaths` in the reachability integration test — a unit test may
 *         not touch the filesystem (`rule.forbid.unit.remote-boundaries`).
 *         ⇒ the two are complements, never duplicates, and may not be merged.
 *
 * .note = `role` is an input rather than a literal, so this op carries no one role's
 *         identity. the caller names the tree its own hooks port into.
 */
export const asMalformedHookPaths = (input: {
  paths: string[];
  role: string;
}): string[] => {
  const shape = new RegExp(
    `^\\.agent/repo=ehmpathy/role=${input.role}/inits/claude\\.hooks/[a-zA-Z0-9.-]+\\.sh$`,
  );
  return input.paths.filter((hookPath) => !shape.test(hookPath));
};
