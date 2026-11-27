# F2: a hint on the push tree's found-pr line

- **fork**: when push finds an extant pr, its tree reads `pr #N (found)` (`git.commit.push.sh:685`). a one-line hint there ("to edit it: rhx git.pull.description set / git.pull.title set") meets the driver at the moment of need, with no `--help` read. add it, or keep the change to `--help` + header
- **taken**: not, in this pr. the wish names the help as the surface; a tree change ripples into many push snapshots. precedent favors it as a follow-up: `git.commit.set` already names `git.branch.cutover` in its output at the moment of need (`git.commit.set.sh:656`, `boot.yml:115`)
- **rework**: clean — additive tree line; snapshot updates, no contract change
- **confidence**: 70% — the hint may reach more drivers than the help does; no stat in hand to prove it
- **where**: `1.vision.yield.md` open question 4
- **verdict**: stands (S1). the follow-up is caught: `dreams/2026_11_24.add-edit-verb-hint-on-push-found-pr-line.dream.md`
