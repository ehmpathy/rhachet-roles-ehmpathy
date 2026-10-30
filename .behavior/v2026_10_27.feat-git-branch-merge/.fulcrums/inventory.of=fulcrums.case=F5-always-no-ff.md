# F5 — always `--no-ff`

- **fork**: (a) let git fast-forward when the branch has no commits ahead · (b) always `--no-ff`
- **taken**: (b). a fast-forward leaves HEAD authored by a human; `git.commit.push.sh:369-385` then refuses the push
- **rework**: clean. one flag
- **risk**: low. `--no-ff` adds one merge commit where a fast-forward would add none; the commit is squashed away on release. the opposite choice is the risky one: a silent dead-end at push
- **confidence**: 95%
- **where**: `1.vision.yield.md` Q5
- **verdict**: open
