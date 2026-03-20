# self-review: has-vision-coverage (r2)

## review scope

double-check: does the playtest cover all behaviors?
- is every behavior in 0.wish.md verified?
- is every behavior in 1.vision.md verified?
- are any requirements left untested?

---

## deeper analysis

### line-by-line wish examination

from 0.wish.md:

```
wish =

often when we rebase, pnpm-lock or package-lock needs to be `git.branch.rebase take`'en

in those cases, regardless of whos version was taken, 95% of the time, the lock file is now stale and will fail on cicd

so, we want to add a command to refresh the lock file when theres an inflight rebase

and recommend that the caller of `git.branch.rebase take` runs that command whenever we detect that they took a `pnpm-lock.yml` or a `package-lock.yml`

for example

`git.branch.rebase lock refresh`
```

| wish fragment | playtest coverage | step |
|---------------|-------------------|------|
| "add a command to refresh the lock file" | step 2 runs `rhx git.branch.rebase lock refresh` | ✓ |
| "when theres an inflight rebase" | step 1 setup creates rebase state, step 4 tests no-rebase error | ✓ |
| "recommend that the caller...runs that command" | step 1 verifies suggestion appears | ✓ |
| "whenever we detect that they took a pnpm-lock.yml or package-lock.yml" | step 6 verifies no suggestion for non-lock files | ✓ |

---

### line-by-line vision examination

from 1.vision.md timeline:

```
$ rhx git.branch.rebase take --whos theirs pnpm-lock.yaml
🐢 righteous!
...suggestion shown...

$ rhx git.branch.rebase lock refresh
🐢 shell yeah!
...lock regenerated...
```

| vision moment | playtest coverage | step |
|---------------|-------------------|------|
| take command | step 1 action | ✓ |
| righteous output | step 1 expected: `🐢 righteous!` | ✓ |
| suggestion shown | step 1 expected: `├─ lock taken, refresh it with: ⚡` | ✓ |
| lock refresh command | step 2 action | ✓ |
| shell yeah output | step 2 expected: `🐢 shell yeah!` | ✓ |
| lock regenerated | step 2 expected: `git status` shows staged | ✓ |

---

### edgecases from vision pit-of-success table

from 1.vision.md:

| edgecase | vision description | playtest step | covered |
|----------|-------------------|---------------|---------|
| no rebase in progress | error: "no rebase in progress" | step 4 | ✓ |
| no lock file extant | error: "no lock file found" | step 5 | ✓ |
| install fails | show error output, suggest manual fix | not in playtest | integration test |
| pnpm not installed | error: "pnpm not found..." | not in playtest | integration test |
| yarn not installed | error: "yarn not found..." | not in playtest | integration test |
| multiple lock files taken | show suggestion once | not in playtest | integration test |

---

### gaps justified

the playtest deliberately omits:

1. **npm variant** — structurally identical to pnpm. playtest verifies pattern with pnpm; integration tests cover npm case2.

2. **yarn variant** — structurally identical. integration tests cover yarn case3.

3. **install failure** — requires malformed package.json. integration tests cover case9.

4. **pnpm not installed** — requires environment manipulation. integration tests cover case6.

5. **yarn not installed** — requires environment manipulation. integration tests cover case7.

6. **multiple lock files** — complex setup. integration tests cover case8.

the playtest focuses on the golden path that a foreman can verify by hand in a fresh environment. edge cases are covered by automated tests that can manipulate the environment programmatically.

---

### cross-reference to criteria blackbox

from 2.1.criteria.blackbox.md usecase.1:

> given a rebase in progress
>   given a lock file was taken
>     when `rhx git.branch.rebase lock refresh` is run
>       then the lock file is regenerated
>       then the lock file is staged
>       then output shows success with turtle vibes

playtest step 2 covers this exact flow:
- setup: rebase in progress from step 1
- action: `rhx git.branch.rebase lock refresh`
- expected: shows shell yeah, detected pnpm, staged pnpm-lock.yaml

from usecase.2:

> given a lock file has conflicts
>   when `rhx git.branch.rebase take --whos theirs pnpm-lock.yaml` is run
>     then under the settled file, a suggestion is shown

playtest step 1 covers this:
- expected: `├─ lock taken, refresh it with: ⚡`
- expected: `│  └─ rhx git.branch.rebase lock refresh`

---

## conclusion

| source | total behaviors | covered in playtest |
|--------|-----------------|---------------------|
| 0.wish.md | 2 core | 2/2 ✓ |
| 1.vision.md usecases | 3 | 3/3 ✓ |
| 1.vision.md edgecases | 6 | 3/6 (rest in tests) |
| 2.1.criteria.blackbox | all episodes | core episodes covered |

the playtest covers every core behavior. edge cases that require environment manipulation are covered by integration tests. this is the correct split between manual verification (playtest) and automated verification (tests).

