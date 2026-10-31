# F9 — extant defects in a touched file, outside the diff

## .the fork
review i003 graded whole files, so it raised defects in `git.commit.push.sh` that ship on main and
that this change never touched (push.sh diff: one `source` line, the push-refusal block, and the
json `fix` field):
- r006 blocker.1: `git log … 2>/dev/null || echo ""` hides a git failure in the pr title/body read
- r007 blocker.1: the author and branch guards read HEAD, then `git push origin HEAD` re-reads it
- nitpicks: custom coconut headers, `print_instruction` hints, an `if/elif/else` guard, a bare
  `--pr-title-fallback`, a silent `*) shift`, hand-built glyphs in the pr-open guide

- (A) fix each here
- (B) fix the small, safe, clean ones here; dream the ones that change push behavior

## .taken, why
B. this round fixed the cheap ones: plan json now escapes every value through
`escape_json_string` (r007 blocker.2), and `get_ordered_pr_fixes` / `emit_pr_open_guide` take named
args with `auth` passed in (r004 blocker.1, nitpick.1). the git-log failhide and the HEAD race each
change how push behaves on a real repo (an empty-history repo, a moved HEAD); each needs its own
clamp and its own review, and neither touches the quota refusal. both ride
`dreams/v2026_10_30.fix.push-extant-hazards.md`.

## .rework
clean: each dreamed fix lands in push.sh alone, with no ripple into the quota render.

## .risk
medium: the HEAD race and the failhide ship on main today; this pr neither adds nor widens them.

## .confidence
75%: a reviewer may read "a file you touched" as "a defect you own".

## .verdict
the director, 2026-10-30: F9 stays the driver's best-guess (small safe ones here, dreams for push
behavior). round i004 added one more small safe fix under it: the rebase pull exit code (clamped).

## .settled in review, 5.3 i005
two peer lanes asked opposites on the rebase render fixes in `begin.sh` (the open `├─` on the last
ahead row; `1 commits`; the up-to-date labels): ergo-snapshot-visual-blemishes asked for them (i001,
i002); enroll-verif-test-intent asked to revert them (i003–i005), since they moved two lines of the
extant journey snapshot, a locked contract outside the wish. after the third raise the driver
reverted them: the revert was clean, it regresses no guarantee of the wish, and the asker had since
approved. the real bug fixes in the same file stay (`grep -c . || true`, the pull exit code). the
cosmetic fixes ride `dreams/v2026_10_30.fix.rebase-tests-reach-a-real-origin.md` items 4 and 6.
so B's line sharpens: a small safe fix rides the pr only where it moves no locked snapshot of
behavior outside the wish.
