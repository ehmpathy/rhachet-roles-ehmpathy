# F35 — the one-arm-site rule is clamped by a read of the shell sources

## .the fork

F19 spends the release use at the arm of the merge, and only there. `[case-arm-site]` reads every
`git.release/*.sh` and asserts exactly one live `enable_automerge` call site. 5.3 r4
(ergo-acceptance-journey-coverage, release-scenes nitpick.4) calls it a brittle whitebox test.

- **A (taken)** — keep the source clamp beside the behavior tests (spend at the arm, refund on a
  failed arm, no spend on a refusal before the arm)
- **B** — drop it; rely on the behavior tests alone

## .taken, and why

A. the behavior tests prove the spend on the paths a scene drives. a second `enable_automerge` call
added on a path no scene drives would arm a merge with no spend — a free release — and stay green
under B. "exactly one call site" is a claim about the whole source, so it must read the source.
the src read is sound: the build copies each `.sh` into `dist/` byte for byte. an inert refactor of
that one line reddens it, and that is the review moment the rule wants.

## .rework

clean — one test case.

## .confidence

75% — the exact-line match is stricter than the claim needs.

## .where

`src/domain.roles/mechanic/skills/git.release/git.release._.emit_transport_status.integration.test.ts`
`[case-arm-site]`

## .verdict

open — for the fulcrum council.
