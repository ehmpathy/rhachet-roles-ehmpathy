# F25: the set.package audit leg stays hermetic, with live legs beside it

## the fork

main's set.package install and upgrade suites post every case's audit to the live npm advisory
api, and its `security-block` snapshot pins the live answer. r012 (5.3 i003 b1) asks to restore
that: live calls on every case, with the volatile rows scrubbed in `asStableOutput`.

(a) restore main's live audit on every case, scrub the rows · (b) keep the fake `curl`, which
answers from a per-case fixture, pin main's 10 rows verbatim in that fixture, and keep live legs as
separate cases (install case15 real pass, case16 real block, upgrade case7 real block)

## taken: (b), and why at the time

- the drift turned a PASS case red, not only a snapshot: zod@3.22.4 gained a live high advisory
  (GHSA-mrhx-c7xc-m3w5), so the skill blocked it, correctly, and the case expected an install.
  a row scrub cures a snapshot; it cannot cure a pass case whose input the registry now flags.
  under (a), any advisory on any package a pass case names turns ci red with no change here
- the snapshot half of r012's ask is met in full: the fixture holds main's 10 rows verbatim, and
  `git diff origin/main -- src/domain.roles/mechanic/skills/set.package/__snapshots__/` prints
  naught. the special-character titles and the long-list render stay pinned
- the live contract is not dropped: three cases run both legs live, with no fake bin, and assert
  a real pass and a real block. the mock carries its `.mock` / `.why` / `.real` header at the site
  (`rule.forbid.integration.mocks`)
- main's suite was red on this host's run before the change; ci on this pr needs it green
- ci runs the full integration suite (`THOROUGH=true` in `.github/workflows/.test.yml`), so a
  revert to main's live tests reaches this pr's ci. a peer pr,
  `beav/fix-rebase-sets-aside-actor-drift`, went green today only after it resnapped both
  set.package snaps against the live registry (its compare lists both `.snap` files): main's live
  contract drifts, and each pr that meets it pays a resnap
- the live legs now pin their frame as well as their shape: install `[case16]` and upgrade
  `[case7]` snap the live block with the registry-owned count and rows masked (5.3 i004 r002 n1)

## rework: clean

two test files, one fixture constant, one helper. a revert to (a) is a file restore plus a scrub.

## confidence: 80%, and why it is low

r012 reads main's header ("the audit leg is never faked") as the contract, and it has a point:
a fixture can drift from the registry's real answer shape. the three live cases guard the shape,
but only for lodash. if the council wants every case live, (a) plus a pass-case input chosen for
a clean audit history is the alternative, at the cost of a red ci whenever that input is flagged.

## where

`src/domain.roles/mechanic/skills/set.package/set.package.install.integration.test.ts`,
`set.package.upgrade.integration.test.ts`

## verdict

ruled — director, 2026-11-04 ~12:5xZ: (b), the audit leg stays hermetic. the live audit
(install `[case16]`, upgrade `[case7]`) moves behind a named flag that skips by default.

landed (5.3 i005), in the shape the repo already holds for `git.pull.comment.real`:
- the two live blocks this branch added (install case16, upgrade case7) moved to
  `set.package.install.real.integration.test.ts` and `set.package.upgrade.real.integration.test.ts`
- `jest.integration.config.ts` `testMatch` excludes both by name, with the hand command beside the
  exclusion; the default run holds zero skips, and a hand run fails loud
- main's own live pass, install `[case15]`, stays in the default suite, unchanged: the decision
  gates the live audit this branch added, not a case main shipped
- both default set.package snaps equal the fork base (`git diff 421f1f5 --numstat` prints naught);
  75/75 (`what=integration/2026-11-04T13-22-06Z`)
- no hand run of the two `.real` files is owed: ci is the gate, never a local suite (director,
  2026-11-04 ~14:3xZ). their checks are the ones that passed in the default suites at `12-20-20Z`
  (85/85)
