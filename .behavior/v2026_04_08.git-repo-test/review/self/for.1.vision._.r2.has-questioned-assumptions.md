# review.self r2: has-questioned-assumptions

second pass with fresh eyes. look for assumptions i missed in r1.

the first review (r1) questioned conceptual assumptions - things like "do repos have test:unit commands?" and "should keyrack unlock for all test types?"

this second review (r2) looks for IMPLEMENTATION assumptions - details i wrote into the vision that assume things about HOW the skill will work, without evidence.

---

## methodology for r2

i re-read each output example in the vision and asked:
- where does this data come from?
- can i actually get this data reliably?
- what would break this?

---

## re-read the vision slowly

i read through the vision line by line. here's what i noticed on second pass:

---

## assumption 8: output format is correct (MISSED IN R1)

**in vision:**
```
🐚 git.repo.test --what unit --scope getUserById
   ├─ status: passed
   ├─ tests: 3 passed
   ├─ time: 0.8s
   └─ log: .log/role=mechanic/skill=git.repo.test/2026-04-08T14-23-01Z.stdout.log
```

**what we assume:** we can parse jest/vitest output to extract:
- number of tests passed/failed
- execution time

**what if opposite?**
- jest output format might change between versions
- vitest format might be different
- custom reporters might alter output

**evidence:** none. i invented this output format without a check against actual jest output.

**counterexamples:** jest verbose mode, vitest, custom reporters.

**verdict:** FRAGILE. we can't reliably parse test counts from output.

**resolution:** simplify. don't parse test counts. just show:
- status: passed | failed
- log: path

the actual counts are in the log. clones can read them there.

**how i fixed it:**

1. opened 1.vision.md
2. found the output examples (lines 22-30, 87-94, 97-107, 112-126)
3. removed `tests: X passed` and `time: X.Xs` from each
4. simplified to just: status + log path

the vision now shows:
```
🐚 git.repo.test --what unit --scope getUserById
   ├─ status: passed
   └─ log: .log/role=mechanic/skill=git.repo.test/2026-04-08T14-23-01Z.stdout.log
```

this is simpler, more honest, and more reliable.

---

## assumption 9: "tests: X passed" can be extracted (SAME ISSUE)

this is the same issue as #8, just a different manifestation. the vision showed `tests: 4 passed` in multiple places. i removed them all.

**why this matters:** if we promise to show test counts in the output, clones will expect them. but if we can't reliably deliver, we break trust. better to under-promise and over-deliver.

---

## assumption 10: time can be extracted (MISSED IN R1)

**in vision:** `time: 0.8s`

**what we assume:** we can extract execution time from jest output.

**what if opposite?**
- npm also prints time
- jest time format varies
- time values overlap and confuse

**verdict:** FRAGILE but ACCEPTABLE. npm prints time. we can capture that. but don't over-engineer the parse.

**resolution:** keep `time` but get it from npm stdout, not parsed from jest.

---

## assumption 11: "--" passthrough works with npm (MISSED IN R1)

**in vision:**
```
rhx git.repo.test --what unit -- --testNamePattern="should return"
```

**what we assume:** args after `--` pass through to the test runner.

**evidence:** npm convention. `npm run test -- args` passes to the base command.

**what if opposite?**
- pnpm might handle differently
- custom npm commands might not pass through

**verdict:** CORRECT. npm `--` passthrough is a well-documented convention.

**no change needed.**

---

## assumption 12: watch mode is out of scope (IMPLICIT)

**what we assume:** the skill doesn't support watch mode.

**evidence:** watch mode is interactive, can't tee, can't run in background.

**did wisher say this?** no. wisher didn't mention watch.

**verdict:** CORRECT for initial scope. watch mode is complex and not requested.

**no change needed.** document as out of scope if needed.

---

## changes to vision from r2

1. **simplified output format**: removed `tests: X passed` from output examples. the skill will show:
   - status: passed | failed
   - time: from npm (if available)
   - log: path

   actual test counts are in the log file. this is simpler and more reliable.

---

## assumptions that held on second review

each of these held because they have solid grounding:

### npm command names (`test:unit`, etc.)
- **why it holds:** this is the ehmpathy convention. the skill targets ehmpathy repos specifically.
- **how we handle edge cases:** fail fast with helpful error if command absent. the clone learns what's expected.

### ehmpath keyrack owner
- **why it holds:** documented in howto.keyrack brief. mechanics always use `ehmpath` owner.
- **no alternatives:** this is the only correct answer for ehmpathy context.

### jest/vitest test runner
- **why it holds:** these are the dominant test runners in ehmpathy repos.
- **how we handle edge cases:** documented as open question. start with jest, add vitest later.

### RESNAP=true convention
- **why it holds:** seen in permission patterns. this is how ehmpathy repos work.
- **evidence:** `RESNAP=true npm run test:unit` in pre-approved permissions.

### tee for output capture
- **why it holds:** standard unix pattern. well-understood.
- **noted fragility:** color codes might need special handling. implementation must verify.

### keyrack only for integration/acceptance
- **why it holds:** unit tests don't hit external services. lint doesn't need credentials.
- **how i verified:** thought through each test type's needs. only integration/acceptance need external access.

### keyrack idempotency
- **why it holds:** keyrack is designed to be idempotent. unlock is safe to call multiple times.
- **implementation note:** still need to handle errors (keyrack not configured, network issue).

### `--` passthrough to npm
- **why it holds:** this is documented npm behavior. `npm run cmd -- args` passes args to the command.
- **evidence:** npm documentation, widespread usage.

### watch mode out of scope
- **why it holds:** wish didn't request it. watch mode is interactive and complex.
- **deferred:** can add later if requested.

---

## what i learned on r2

### lesson 1: don't invent implementation details

i wrote `tests: 4 passed` in the output examples. this looked nice but assumed i could:
- parse jest output reliably
- handle vitest's different format
- handle custom reporters

none of these were verified. i invented the detail because it seemed useful.

**takeaway:** vision should show what's achievable, not what's aspirational.

### lesson 2: simpler output is more reliable

by simplifying to just `status: passed` and `log: path`, i:
- removed fragile implementation assumptions
- made the contract clearer
- still gave clones what they need (log has all details)

**takeaway:** when in doubt, simplify. the log file has all the details.

### lesson 3: r1 vs r2 find different things

- r1 found conceptual issues: "should keyrack unlock for all tests?" (no, only integration/acceptance)
- r2 found implementation issues: "can we parse test counts?" (no, it's fragile)

**takeaway:** multiple review passes catch different categories of issues. first pass catches big-picture problems. second pass catches detail problems.

### lesson 4: check every line of output examples

the output examples in a vision document ARE implementation contracts. every line implies something the skill must deliver.

i didn't question each line in r1. in r2, i questioned them and found fragile assumptions.

**takeaway:** review output examples line by line. ask "where does this data come from?"
