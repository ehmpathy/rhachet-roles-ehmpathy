# self-review: has-vision-coverage (r1)

## review scope

double-check: does the playtest cover all behaviors?
- is every behavior in 0.wish.md verified?
- is every behavior in 1.vision.md verified?
- are any requirements left untested?

---

## why it holds

### behaviors from wish

**wish says:**
1. add a command to refresh the lock file when there's an inflight rebase
2. recommend that the caller of `git.branch.rebase take` runs that command whenever we detect that they took a `pnpm-lock.yml` or a `package-lock.yml`

**playtest coverage:**

| wish behavior | playtest step | covered |
|---------------|---------------|---------|
| lock refresh command | step 2 | ✓ |
| suggestion after take | step 1 | ✓ |

---

### behaviors from vision

**vision timeline:**
```
$ rhx git.branch.rebase take --whos theirs pnpm-lock.yaml
🐢 righteous!
...suggestion shown...

$ rhx git.branch.rebase lock refresh
🐢 shell yeah!
...lock regenerated...
```

**playtest coverage:**

| vision behavior | playtest step | covered |
|-----------------|---------------|---------|
| take shows suggestion | step 1 | ✓ |
| lock refresh works | step 2 | ✓ |
| continue succeeds | step 3 | ✓ |

---

### vision usecases

| usecase | vision description | playtest step | covered |
|---------|-------------------|---------------|---------|
| usecase.1 | refresh lock file after take | step 2 | ✓ |
| usecase.2 | proactive suggestion after take | step 1 | ✓ |
| usecase.3 | package manager detection | step 2 (pnpm) | ✓ |

---

### vision edgecases

| edgecase | playtest step | covered |
|----------|---------------|---------|
| no rebase in progress | step 4 | ✓ |
| no lock file extant | step 5 | ✓ |
| non-lock file (no suggestion) | step 6 | ✓ |

---

### requirements left untested

checked for gaps:

| requirement | in playtest? |
|-------------|--------------|
| npm instead of pnpm | no |
| yarn instead of pnpm | no |
| pnpm not installed error | no |
| install fails error | no |
| multiple lock files taken | no |

**why these are acceptable gaps:**

1. **npm and yarn variants** — structurally identical to pnpm path. playtest verifies the pattern; tests verify the variants.

2. **pnpm not installed** — requires environment manipulation that complicates the playtest. tested in integration tests.

3. **install fails** — requires malformed package.json. tested in integration tests.

4. **multiple lock files** — tested in integration tests (case13).

the playtest focuses on the happy path and key error cases. edge cases are covered by automated tests.

---

## conclusion

| source | behaviors | covered |
|--------|-----------|---------|
| 0.wish.md | 2 | 2/2 ✓ |
| 1.vision.md usecases | 3 | 3/3 ✓ |
| 1.vision.md edgecases | 3 | 3/6 (rest in tests) |

all core behaviors are covered. edge cases are handled by integration tests.
