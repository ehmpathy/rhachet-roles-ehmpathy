# F16: the commit gate's 0-byte meter repair rides the cutover commit

- **the fork**: (a) land the `[[ -s ]]` repair to `git.commit.operations.sh` as its own
  `fix(commit)` commit, on its own branch, so a revert of the cutover leaves it; (b) let it ride
  the cutover's one commit, and catch the separate land as a dream
- **taken**: (b). the route lands as one commit and holds one commit unit; a second commit needs a
  second grant. the repair is tested where it lives (`git.commit.set.integration.test.ts`), so the
  only cost of the shared commit is that one revert would undo both
- **rework**: clean — the repair is one hunk plus one test; a later `fix(commit)` branch re-applies
  it in minutes if the cutover ever reverts
- **confidence**: 80% — a reviewer named the revert tie (i005 r011 nitpick.9); a wisher may
  prefer two commits and grant the second unit for it
- **where**: `src/domain.roles/mechanic/skills/git.commit/git.commit.operations.sh`
- **dream**: `dreams/2026_10_21.fix-land-commit-gate-zero-byte-repair-apart.dream.md`
- **verdict**: —
