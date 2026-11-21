# F12 — l3 structural refactors deferred to a dream

## the fork

the l3 lanes (r10 `enroll-impl-behavior-intent`, r11 `enroll-impl-arch-defects`, i008–i009) raised
structural points, every one graded `[nitpick][better]` by r11 itself:

- one resolver for the front half of begin + commit (repo shape, edit-dir bound, installed versions,
  edit-dir state), so the in-tree bound has one producer
- the commit version ladder split into `VERSION_ASKED` / `VERSION_TARGET` + `get_one_version_to_seal`
- `is_path_within_repo_root` moved out of `claude.tools/output.sh` into its own sourceable file
- the set-aside prior patch restored from an EXIT/INT/TERM trap, with the aside kept outside
  `patches/`
- one owner for the note format (`get_patch_note_field` + a round-trip test)

## taken, and why at the time

defer, as one dream (`dreams/v2026_11_10.refactor.git-package-patch-front-half.md`). each point
names no shipped harm. every behavior they guard is already held by a gate and a snapped test this
round: the bound (t10, t11, case5 t2), the identity check (t19, t20, case2 t5–t6), the tracked-dir
guard (t21), one-line note fields (t6.1, the user.name gate), the entry check (t4).

## rework, and why

dirty in sum, clean per gate. r11 (i010) corrected the first read: the front-half gates are each a
sequential `X || refuse_*` in the main shell, so a gate-by-gate lift keeps the order and the refusal
text. what stays dirty is the seal rework (it changes the crash path every revert test pins) and the
path move (it touches `claude.tools/output.sh`, which other skills source). together they are a
review round of their own.

## confidence, and why it is low

75%. r11 argues the bound is a security invariant, which tipped toward an extract now. i010 found
the live-install hole in that bound; the repair put it behind one producer, `is_edit_dir_allowed`,
called from both phases and clamped by `[t22]` and `[t23]`. so the invariant has one owner today, and
what remains is duplicated refusal text, which a drift turns red rather than silent.

## where

`git.package.patch.begin.sh`, `git.package.patch.commit.sh`, `git.package.patch.operations.sh`.

## verdict

open.
