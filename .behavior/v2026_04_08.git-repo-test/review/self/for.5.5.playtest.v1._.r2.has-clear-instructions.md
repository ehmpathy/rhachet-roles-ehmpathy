# review.self: has-clear-instructions (r2)

## review scope

second pass. skeptic review: walk through playtest as if you are the foreman with no context.

---

## skeptic walkthrough: happy path 1

**instruction:** run `rhx git.repo.test --what unit`

**as foreman, i ask:**

1. **where do i run this?**
   - playtest says "can be run in this repo (rhachet-roles-ehmpathy)"
   - but notes section is at the bottom — foreman might miss it
   - **issue found:** move repo context to prerequisites

2. **what if build is stale?**
   - prerequisite says `npm run build` but doesn't explain why
   - **issue found:** add explanation that skill runs from dist/

3. **what does namespaced log path look like?**
   - says "log paths are namespaced with `what=unit`"
   - but doesn't show example path
   - **issue found:** show exact example path

---

## fixes applied

### fix 1: move repo context to prerequisites

**before:** notes section at bottom mentions repo
**after:** prerequisites section explicitly states where to run

### fix 2: explain build requirement

**before:** `repo with build complete (npm run build)`
**after:** `repo with build complete — run npm run build so dist/ is current`

### fix 3: show example log paths

**before:** "log paths are namespaced with `what=unit`"
**after:** add example: `.log/role=mechanic/skill=git.repo.test/what=unit/2026-04-08T14-23-01Z.stdout.log`

---

## skeptic walkthrough: edge case E2

**instruction:** run `rhx git.repo.test --what acceptance` in repo without test:acceptance

**as foreman, i ask:**

1. **does this repo have test:acceptance?**
   - rhachet-roles-ehmpathy may or may not have this command
   - foreman needs to know whether this edge case applies here
   - **issue found:** clarify whether test:acceptance exists in this repo

2. **how do i test absent command scenario?**
   - if this repo has the command, foreman can't test edge case
   - **issue found:** provide alternative test method

---

## fixes applied

### fix 4: clarify command availability

**before:** assumes foreman knows what commands exist
**after:** add note that foreman should first check `npm run` to see available commands

### fix 5: provide alternative for edge case E2

**before:** just says "in repo without test:acceptance"
**after:** explain: "if this repo has test:acceptance, create a temp repo without it, or skip this edge case"

---

## playtest document updated

i will now update the playtest document with these fixes.

---

## why it holds (after fixes)

1. **prerequisites include repo context**: foreman knows where to run
2. **build requirement explained**: foreman understands why build is needed
3. **example paths shown**: foreman knows exact expected format
4. **edge case test clarified**: foreman knows how to verify absent command
5. **all commands still copy-pasteable**: no regression

the instructions are now followable with explicit context.

**conclusion: has-clear-instructions = verified (second pass, after fixes)**

