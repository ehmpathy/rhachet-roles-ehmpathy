# self-review: has-journey-tests-from-repros (r5)

## review scope

look back at the repros artifact:
- .behavior/v2026_03_19.git-rebase-lock-refresh/3.2.distill.repros.experience.*.md

for each journey test sketch in repros:
- is there a test file for it?
- does the test follow the BDD given/when/then structure?
- does each `when([tN])` step exist?

---

## why it holds

### no repros artifact extant — this is expected

searched for repros artifacts:

```sh
ls .behavior/v2026_03_19.git-rebase-lock-refresh/3.2.distill.repros.experience.*.md
# result: no files found
```

**why this is expected:**

the route for this behavior followed a path that did not include the repros phase. the files extant in the .behavior directory are:

| phase | file | extant? |
|-------|------|---------|
| 0 | 0.wish.md | yes |
| 1 | 1.vision.stone | yes |
| 2.1 | 2.1.criteria.blackbox.stone | yes |
| 2.2 | 2.2.criteria.blackbox.matrix.stone | yes |
| 3.1.3 | 3.1.3.research.internal.product.code.*.stone | yes |
| 3.2 | 3.2.distill.repros.experience.*.md | **no** |
| 3.3.1 | 3.3.1.blueprint.product.*.stone | yes |

the repros phase was not part of this particular workflow. this is valid — not every route requires repros.

---

### journey tests derive from criteria blackbox instead

the criteria blackbox (2.1.criteria.blackbox.stone) defines:
- usecase.1: refresh lock file after take
- usecase.2: proactive suggestion after take
- usecase.3: package manager detection

the integration tests (git.branch.rebase.lock.integration.test.ts) cover these usecases:

| criteria usecase | test coverage |
|------------------|---------------|
| usecase.1 successful refresh | case1-3 (pnpm, npm, yarn) |
| usecase.1 error cases | case4-9 |
| usecase.2 suggestion | case12-14 in take tests |
| usecase.3 pm detection | case8 |

---

### alternative: vision provides journey sketch

while no formal repros artifact extant, the vision (1.vision.stone) contains an example timeline:

```
$ rhx git.branch.rebase take --whos theirs pnpm-lock.yaml
🐢 righteous!

🐚 git.branch.rebase take
   ├─ whos: theirs
   ├─ settled
   │  └─ pnpm-lock.yaml ✓
   │     └─ lock taken, refresh it with: ⚡
   │        └─ rhx git.branch.rebase lock refresh
   └─ done

$ rhx git.branch.rebase lock refresh
🐢 shell yeah!

🐚 git.branch.rebase lock refresh
   ├─ detected: pnpm
   ├─ run: pnpm install
   ├─ staged
   │  └─ pnpm-lock.yaml ✓
   └─ done
```

this journey is tested via:
- take.integration.test.ts case12 (take lock file → suggestion shown)
- lock.integration.test.ts case1 (lock refresh → regenerated and staged)

---

## conclusion

| check | result |
|-------|--------|
| repros artifact extant | no — not part of this route |
| journey from vision covered | yes — take + lock refresh flow tested |
| journey from criteria covered | yes — all usecases have test coverage |

no repros artifact extant. journey tests derive from vision and criteria instead.

