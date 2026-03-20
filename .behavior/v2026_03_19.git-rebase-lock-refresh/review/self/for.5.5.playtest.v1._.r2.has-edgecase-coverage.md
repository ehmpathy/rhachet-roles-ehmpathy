# self-review: has-edgecase-coverage (r2)

## review scope

double-check: are edge cases covered?
- what could go wrong?
- what inputs are unusual but valid?
- are boundaries tested?

---

## what could go wrong?

### enumerated failure modes

| failure mode | playtest coverage | step |
|--------------|-------------------|------|
| no rebase in progress | yes | step 4 |
| no lock file extant | yes | step 5 |
| non-lock file (no suggestion) | yes | step 6 |
| pnpm install fails | no | integration test case9 |
| pnpm not installed | no | integration test case6 |
| yarn not installed | no | integration test case7 |
| multiple lock files | no | integration test case8 |

---

### playtest step 4: no rebase in progress

from 5.5.playtest.v1.i1.md:

```sh
cd ..
mkdir playtest-no-rebase && cd playtest-no-rebase
git init
rhx git.branch.rebase lock refresh
```

expected outcome:
- output shows `🐢 hold up dude...`
- output shows `└─ error: no rebase in progress`
- exit code is non-zero

**why this matters:** prevents confusion when command is run outside rebase context. the error message is actionable — it tells the mechanic exactly what is wrong.

---

### playtest step 5: no lock file extant

from 5.5.playtest.v1.i1.md:

```sh
cd ..
mkdir playtest-no-lock && cd playtest-no-lock
git init
echo 'console.log("hello")' > index.js
git add -A && git commit -m "initial"
git checkout -b feature
echo 'console.log("world")' > index.js
git add -A && git commit -m "feature"
git checkout main
echo 'console.log("main")' > index.js
git add -A && git commit -m "main"
git checkout feature
git rebase main
```

then:
```sh
rhx git.branch.rebase lock refresh
```

expected outcome:
- output shows `🐢 hold up dude...`
- output shows `└─ error: no lock file found`

**why this matters:** repos without package managers should not see confuse messages about pnpm/npm/yarn. the error is clear — there is no lock file to refresh.

---

### playtest step 6: non-lock file (no suggestion)

from 5.5.playtest.v1.i1.md:

```sh
rhx git.branch.rebase take --whos theirs index.js
```

expected outcome:
- output shows `├─ settled` with `index.js ✓`
- output does NOT show lock refresh suggestion
- output goes directly to `└─ done`

**why this matters:** the suggestion should only appear for lock files. non-lock files should not trigger the suggestion. this prevents noise in the output.

---

## what inputs are unusual but valid?

### unusual valid inputs in playtest

| input | coverage | step |
|-------|----------|------|
| fresh git repo | yes | step 4 (no rebase) |
| repo without package.json | yes | step 5 (no lock) |
| non-lock file in rebase | yes | step 6 |
| pnpm-lock.yaml (standard) | yes | step 1-3 |

### unusual valid inputs NOT in playtest

| input | why not covered | where covered |
|-------|-----------------|---------------|
| package-lock.json | same pattern as pnpm | integration test case2 |
| yarn.lock | same pattern as pnpm | integration test case3 |
| both pnpm and npm locks | complex setup | integration test case8 |
| glob pattern `take .` | covered in integration | integration test case13-14 |

---

## are boundaries tested?

### boundaries in this feature

| boundary | playtest coverage |
|----------|-------------------|
| rebase state: in progress vs not | yes (step 4) |
| lock file: extant vs not | yes (step 5) |
| file type: lock vs non-lock | yes (step 6) |
| package manager: pnpm vs others | partial (pnpm only) |

---

## gaps justified

the playtest tests the key boundaries:

1. **rebase boundary** — step 4 tests the no-rebase case
2. **lock existence boundary** — step 5 tests the no-lock case
3. **file type boundary** — step 6 tests non-lock files

the playtest does NOT test:

1. **npm/yarn variants** — same logic path, different pm. integration tests cover.
2. **install failures** — requires bad package.json. integration tests cover.
3. **pm not installed** — requires env manipulation. integration tests cover.

this split is intentional: playtests verify what a human can easily verify by hand. edge cases that require environment manipulation belong in automated tests.

---

## conclusion

| question | answer |
|----------|--------|
| what could go wrong? | 3 failure modes covered in playtest, 4 in integration tests |
| unusual but valid inputs? | fresh repo, no-lock repo, non-lock file covered |
| boundaries tested? | rebase state, lock existence, file type boundaries covered |

the playtest covers the essential edge cases. advanced edge cases are covered by integration tests.

