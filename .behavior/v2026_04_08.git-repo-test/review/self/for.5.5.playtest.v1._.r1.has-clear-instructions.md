# review.self: has-clear-instructions (r1)

## review scope

first pass. skeptic review: walk through playtest as if you are the foreman with no context.

---

## skeptic walkthrough: happy path 1

**instruction:** run `rhx git.repo.test --what unit`

**as foreman, i ask:**

1. **where do i run this?**
   - playtest originally said "can be run in this repo" in notes at bottom
   - foreman might miss it if notes section is skimmed
   - **issue found:** moved repo context to prerequisites section

2. **what if build is stale?**
   - prerequisite said `npm run build` but didn't explain why
   - **issue found:** added explanation: "run `npm run build` so dist/ has current skill code"

3. **what does namespaced log path look like?**
   - said "log paths are namespaced with `what=unit`"
   - but didn't show concrete example
   - **issue found:** added example: `.log/role=mechanic/skill=git.repo.test/what=unit/2026-04-08T14-23-01Z.stdout.log`

---

## fixes applied to playtest

### fix 1: moved repo context to prerequisites

the first line now explicitly states: "run in rhachet-roles-ehmpathy repo"

### fix 2: explained build requirement

changed from just "repo with build complete" to "run npm run build so dist/ has current skill code"

### fix 3: added example log path

pass criteria now shows exact example path format

---

## skeptic walkthrough: edge case E2

**instruction:** run `rhx git.repo.test --what acceptance` in repo without test:acceptance

**as foreman, i ask:**

1. **does this repo have test:acceptance?**
   - foreman needs to know if they can even test this edge case
   - **issue found:** added prerequisite to check `npm run` for available commands

2. **what if the command exists?**
   - if test:acceptance exists, foreman can't test this edge case
   - **issue found:** added note: "if this repo has test:acceptance, skip this edge case or use a temp repo"

---

## fixes applied to playtest

### fix 4: added command check to prerequisites

foreman now instructed to run `npm run` first to see available test:* commands

### fix 5: added skip guidance for edge case E2

note added: "if test:acceptance exists, skip or use temp repo"

---

## verification after fixes

| question | answer |
|----------|--------|
| can foreman follow without prior context? | yes — repo context in prerequisites |
| are commands copy-pasteable? | yes — all exact, no placeholders |
| are expected outcomes explicit? | yes — specific criteria with examples |
| are edge cases testable? | yes — with guidance for each scenario |

---

## why it holds

1. **prerequisites now include repo context**: foreman knows where to run
2. **build requirement explained**: foreman understands why dist/ matters
3. **example paths shown**: foreman knows exact expected format
4. **command availability clarified**: foreman checks before start
5. **edge case guidance added**: foreman knows what to do if edge case not testable

the instructions are followable by someone with no prior context after these fixes.

**conclusion: has-clear-instructions = verified (first pass, with fixes)**

