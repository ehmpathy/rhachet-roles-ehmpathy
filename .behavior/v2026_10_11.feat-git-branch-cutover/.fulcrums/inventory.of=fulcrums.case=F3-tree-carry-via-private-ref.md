# F3: tree carry via a private ref

- **fork**: hold the uncommitted tree in (a) the stash stack, (b) a temp commit on the source branch,
  or (c) a commit object parked at `refs/cutover/<into>/tree`, built from a temp index.
- **taken**: (c). the stash stack is shared across worktrees and sessions (a race); (b) mutates the
  source branch, which inv-9 forbids. (c) touches neither, and survives a crash for `--abort`.
- **rework**: clean — internal to the skill; the contract (tree carried, still uncommitted) holds
  under any mechanism.
- **confidence**: 80%. the untracked-file + mode-bit fidelity of a temp-index commit is unproven
  here (q6, [research]).
- **where**: q6; cases 5, 9; inv-10.
- **verdict**: narrowed by wisher, 2026-10-12 — "above all, it should never risk loss of untracked work" / "safety first". the private ref parks tracked edits only, byte-verified before any reset; untracked files are never written, moved, or deleted; a collision with an untracked path refuses in preflight (case 12)
