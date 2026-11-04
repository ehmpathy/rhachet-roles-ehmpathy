# S3 — the extant rebase guards move to exit 2

## .said
the wisher picked "Keep the exit 2 change (Recommended)" for the question: The approved vision kept the extant rebase guards (no quota, no push permission, no uses left, base branch, rebase in progress, no rebase in progress) out of scope. At 5.3 I qualified them as `✋ ConstraintError`, which moves their exit code from 1 to 2. A test-intent reviewer now blocks on that: callers that check `$? == 1` would see 2. Which scope do you want?

## .settled
- scope widens past `1.vision.yield.md:80`: every caller-must-fix guard in begin, continue and abort is a qualified `✋ ConstraintError`, exit 2
- the extant tests that pinned exit 1 for those guards pin 2; extant begin guard cases that assert `not.toBe(0)` pin `toBe(2)`
- F6 is ruled: (b) kept

## .landed
- `.fulcrums/inventory.of=fulcrums.case=F6-extant-rebase-guards-left-unqualified.md` (verdict)
- `git.branch.rebase.begin.integration.test.ts` (extant guard cases pin exit 2)
