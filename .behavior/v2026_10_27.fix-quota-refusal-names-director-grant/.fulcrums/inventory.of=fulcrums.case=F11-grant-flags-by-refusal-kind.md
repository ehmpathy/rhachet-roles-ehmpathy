# F11: which permission flags the director grant line carries

## .the fork
the vision sketches showed `--push allow` on every director line. but `git.crew.grant` is read to
overwrite the meter (as `git.commit.uses set` does), so a line copied verbatim sets every flag it names.

| option | the line | cost |
|---|---|---|
| A, always `--push allow` | one fixed line | a uses refusal in a commit-only tree widens push the director never chose |
| B, by refusal kind + meter + the driver's command | push lifts only for a push refusal or a command that pushes (`set --push`, rebase); stage lifts only for a stage refusal; else each keeps the meter's state, or `<allow|block>` where unknown | the line differs by surface; the director reads one more flag |

## .taken, why
B. a grant must lift the refusal and change no other permission. the driver whose command pushes still
gets `--push allow` in one round trip; the driver who only commits never gets push by accident.

## .rework
clean: one transformer, `get_one_director_grant_flags`, clamped by `[case10]` and the skill-level suite.

## .confidence
90%: the reviewers converged on it (i005, i006); the residual doubt is whether `git.crew.grant` merges
rather than overwrites (F5: flags read from logs), in which case the kept flags are redundant, not wrong.

## .where
`git.commit.director.operations.sh`; vision case 3 `[t1]`/`[t1b]`; catalog C4, C14.

## .verdict
none yet; best-guess B.
