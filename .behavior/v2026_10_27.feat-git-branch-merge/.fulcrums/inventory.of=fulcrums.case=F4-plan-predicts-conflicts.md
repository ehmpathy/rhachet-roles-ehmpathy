# F4 — plan does not predict conflicts

- **fork**: (a) plan previews commits and meter only, as rebase does · (b) plan runs `git merge-tree --write-tree` and names the files that will conflict
- **taken**: (a). the wish does not ask for it; `begin --mode apply` then `abort` answers the same question at no cost; (b) needs git ≥ 2.38 and a version branch to test
- **rework**: clean. (b) is additive output
- **risk**: low. without a prediction, a clone learns of conflicts only at apply; `abort` restores the pre-merge state at no meter cost. the cost is one extra command, not harm
- **confidence**: 85%
- **where**: `1.vision.yield.md` Q4; inventory cell #3
- **verdict**: open
