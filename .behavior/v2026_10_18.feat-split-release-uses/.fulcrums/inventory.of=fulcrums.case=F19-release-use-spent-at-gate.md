# F19 — when the release use is spent

## .the fork

the vision says `git.release --mode apply` "spends one use". it does not say when.

| option | when the use is spent | cost |
|---|---|---|
| A | at the gate, as `--mode apply` starts | a refusal later in the run (no pr, unpushed, behind, dirty, red checks) still costs the use |
| **C (taken)** | check at the start; spend at the arm of the merge, just before automerge is enabled | a red ci after the arm, or a watch timeout, still costs the use |
| B | after the merge lands (or the tag ships) | the spend sits deep in the watch loop; a crash or ctrl-c mid-watch ships with no spend, and the gate stays open for a second apply |

## .taken, and why

C. the arm is the act that ships: once automerge is on, github merges with no further word from the crew. so the spend sits exactly there, and every refusal before it spends naught.

- apply checks the stamp first, read only (`--mode check`), so a stampless crew meets the stamp refusal before any other refusal
- `spend_release_use_before_arm` spends once per apply (`--mode spend`), so an `--into prod` apply that arms two prs spends one use
- `arm_release_merge` (`git.release.operations.sh`) is the one arm site: it spends, arms, and refunds (`--mode refund`) when the arm itself fails, so a `gh pr merge` failure leaves the stamp whole; a failed spend write refuses and the arm never runs
- an exit trap prints the spend on every exit path after the arm, so a red ci or a timeout never hides the spent use

## .rework

clean. the spend lives in one leaf, `arm_release_merge`, that `emit_transport_status` calls. a refund on a red ci, or a move to B, changes that leaf and its p2 cases.

## .confidence — 80%, and why it is not higher

the vision does not say when the use is spent. a human may read "one use = one shipped release" and expect a refund when ci goes red after the arm.

## .where

- `src/domain.roles/mechanic/skills/git.release/git.release._.guard_release_meter.sh` — `--mode check|spend`
- `src/domain.roles/mechanic/skills/git.release/git.release.sh` — the check, the footer
- `src/domain.roles/mechanic/skills/git.release/git.release.operations.sh` — `arm_release_merge`
- `src/domain.roles/mechanic/skills/git.release/git.release._.emit_transport_status.sh` — calls `arm_release_merge`
- `git.release.p2.integration.test.ts` `[case-perm-release-only]` — `[t0]` pins uses 1 → 0; `[t1]` pins a behind pr spends none; `[t2]` pins a failed arm refunds to 1
- `git.release.p3.scenes.on_feat.into_prod.integration.test.ts` `[row-49s]` — one stamp of 1 arms feat and release prs, uses 1 → 0

## .verdict

awaited — the council.
