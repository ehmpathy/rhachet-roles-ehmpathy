# F7 — `--whos main|branch` on merge

- **fork**: (a) mirror rebase: `--whos ours|theirs` · (b) `--whos main|branch`
- **taken**: (b). git's `ours` means the branch in a merge and main in a rebase; one flag value with two senses across twin verbs is the overload `rule.forbid.ambiguous-labels` bans
- **rework**: clean. an enum swap
- **risk**: low. if wrong, a clone types `ours`/`theirs` on merge and the enum refuses at parse with the valid set shown; no file is touched. the opposite choice carries the real harm: a silent take of the wrong side's work
- **confidence**: 85%. leaves rebase and merge asymmetric until rebase gains aliases
- **where**: `1.vision.yield.md` Q7; `case=6`
- **verdict**: open
