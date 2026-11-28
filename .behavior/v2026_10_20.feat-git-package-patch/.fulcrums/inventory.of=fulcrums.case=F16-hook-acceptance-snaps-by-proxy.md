# F16 — hook acceptance [case21] snapped by proxy; the genTestDir home leak deferred

## .the fork

`blackbox/pretooluse.check-permissions.acceptance.test.ts` gains `[case21]` (raw `pnpm patch` blocks,
the paved verb passes silent). its snapshots must exist before ci, which runs jest in ci mode and
refuses to write a new snapshot.

this tree cannot run that suite. the local install is rhachet 1.51.0 (the F6 bump, held out of the
PR); its `roles link` links the fixture's `.claude/settings.json` to `$HOME/.claude/settings.json`.
every case fails under it, and a fixture write aims at the human's own global settings — an EACCES
is all that stopped it. the committed lockfile pins 1.48.1, where the suite is green on main.

- **A. snap by proxy** — render the same command under the same allow lines through the integration
  harness (the hook is byte-identical in src and dist), copy that render into the acceptance snap,
  and let ci at 1.48.1 confirm it
- **B. a fresh worktree at HEAD** with the frozen lockfile, changes applied, run the suite there —
  `git worktree add` is not paved here, and a worktree outside the tree is refused as cross-repo
- **C. make `genTestDir` hermetic** — run `roles link` under a home inside the temp dir

## .taken: A, and C deferred to a dream

A: the render does not depend on the allow list — the alternatives come from the inventory — so the
integration render under the verb's own allow lines equals `[case30][t6]`'s, which is pinned. the
silent pass is `{ code: 0, stderr: '', stdout: '' }`, the same shape `[case1][t1]` pins. a wrong copy
fails ci loud, never green.

C was written, then reverted: it changes infra every blackbox suite shares, and it cannot be proven
under 1.48.1 from this tree. it belongs with the bump that creates the hazard.

## .rework

clean: a resnap at 1.48.1 overwrites the two entries; C is a ~6-line change in `invokeHook.ts`.

## .confidence: 80%, and why it is low

the copy is proven equal at the integration seam only; the acceptance seam differs in cwd and env
(`HOME=/nonexistent-home`), neither of which appears in this render — an argument, not a run.

## .where

`blackbox/__snapshots__/pretooluse.check-permissions.acceptance.test.ts.snap` `[case21]`
`blackbox/.test/invokeHook.ts` `genTestDir` (C, deferred)

## .verdict

open — for the fulcrum council.
