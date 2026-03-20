# self-review: has-behavior-coverage

## review scope

verify every behavior from wish/vision has test coverage in the verification checklist.

---

## methodology

1. extract behaviors from 0.wish.md
2. extract behaviors from 1.vision.md
3. map each to test cases in verification checklist
4. flag any behavior without test coverage

---

## wish behaviors

from `0.wish.md`:

| wish behavior | test coverage |
|---------------|---------------|
| add command to refresh lock file mid-rebase | lock.integration.test.ts [case1-3] |
| recommend `take` caller run refresh on lock files | take.integration.test.ts [case12-14] |
| command: `git.branch.rebase lock refresh` | lock.integration.test.ts [all cases] |

**verdict:** all wish behaviors covered ✓

---

## vision behaviors

from `1.vision.md` (in context):

### usecases from vision

| usecase | test file | verified? |
|---------|-----------|-----------|
| lock conflict settled → regenerate lock | lock.integration.test.ts [case1-3] | ✓ |
| proactive suggestion → remind mechanic | take.integration.test.ts [case12-14] | ✓ |

### before/after contrast from vision

**before (old flow):**
> rebase → conflict in pnpm-lock.yaml → take theirs → continue → push → CI fails → pnpm install → commit → push again

**after (new flow):**
> rebase → conflict in pnpm-lock.yaml → take theirs → sees suggestion → lock refresh → continue → CI passes

**verification:** new flow is tested via:
- lock refresh: lock.integration.test.ts [case1] — regenerates lock, stages it
- suggestion: take.integration.test.ts [case12] — shows suggestion after take
- combined flow: both commands work independently, compose naturally

**verdict:** before/after behavior covered ✓

### edgecases from vision

| edgecase | test coverage |
|----------|---------------|
| no rebase in progress | lock.integration.test.ts [case4] |
| no lock file extant | lock.integration.test.ts [case5] |
| install fails | lock.integration.test.ts [case9] |
| pnpm-lock + pnpm not installed | lock.integration.test.ts [case6] |
| yarn.lock + yarn not installed | lock.integration.test.ts [case7] |
| multiple lock files, prefer pnpm | lock.integration.test.ts [case8] |
| multiple files taken, suggestion once | take.integration.test.ts [case13] |

**verdict:** all edgecases covered ✓

### mental model from vision

> "after I take a lock file in rebase, I refresh it so CI doesn't fail"

**test verification:**
- take lock file: take.integration.test.ts [case12]
- shows suggestion: includes "lock taken, refresh it with:"
- refresh regenerates: lock.integration.test.ts [case1]

**verdict:** mental model validated by tests ✓

---

## coverage summary

| source | behaviors | covered |
|--------|-----------|---------|
| wish | 3 | 3 ✓ |
| vision usecases | 2 | 2 ✓ |
| vision before/after | 1 | 1 ✓ |
| vision edgecases | 7 | 7 ✓ |

**total:** 13 behaviors, all covered ✓

---

## hostile reviewer check

**challenge:** "the wish says pnpm-lock.yml — is that tested?"

**response:** the wish has a typo (pnpm-lock.yml vs pnpm-lock.yaml). the implementation correctly uses pnpm-lock.yaml which is the actual filename. tested in lock.integration.test.ts [case1].

**challenge:** "where is yarn.lock suggestion tested?"

**response:** take.integration.test.ts [case12.t2] explicitly tests yarn.lock suggestion.

**challenge:** "the vision mentions npm install — is npm tested?"

**response:** lock.integration.test.ts [case2] tests npm (package-lock.json).

---

## conclusion

| category | status |
|----------|--------|
| wish behaviors | all covered |
| vision usecases | all covered |
| vision edgecases | all covered |

every behavior from wish and vision has test coverage in the verification checklist.

