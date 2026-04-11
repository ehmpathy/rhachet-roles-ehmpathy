# review.self: has-vision-coverage (r3)

## review scope

third pass. line-by-line analysis of wish.md against playtest.

---

## wish.md line-by-line analysis

### line 3: "extend git.repo.test in order to support --what unit | integration | acceptance"

**playtest coverage:**
- happy path 1: `rhx git.repo.test --what unit`
- happy path 2: `rhx git.repo.test --what integration`
- happy path 3: mentions acceptance in context

**skeptic question:** is acceptance explicitly tested?

**analysis:** happy path 3 focuses on scoped tests, not acceptance specifically. the playtest says "run acceptance tests" but the command shown is `--what unit --scope getRole`. however, happy paths 2-3 mention acceptance tests exist.

**issue found:** no dedicated happy path for `--what acceptance`

**fix needed:** add happy path for acceptance tests or clarify coverage

---

### line 5: "and also, to make it easy to --scope to custom subsets via paths and test names"

**playtest coverage:**
- happy path 3: `rhx git.repo.test --what unit --scope getRole`

**skeptic question:** does the playtest cover both file paths AND test names?

**analysis:** happy path 3 uses `--scope getRole` which is a path pattern. the vision says `--scope` is for file paths, and test names use `-- --testNamePattern`. edge case E4 covers passthrough args.

**verdict:** coverage is correct per vision design. playtest covers file path scope.

---

### line 9: "and also to make it easy to --resnap snapshots"

**playtest coverage:**
- happy path 6: `rhx git.repo.test --what unit --resnap`

**verdict:** covered.

---

### line 17: "also, we need to stream the full test results into a .log/.../ dir, just like --what lint does today"

**playtest coverage:**
- pass criteria: "log paths are namespaced"
- happy path 1 pass criteria: "log section with stdout/stderr paths"

**verdict:** covered.

---

### line 19: "except do so both on success and failure for the rest of the tests"

**playtest coverage:**
- happy path 1: shows log paths on success
- fail criteria: implicitly logs on failure

**skeptic question:** does playtest explicitly verify logs on failure?

**analysis:** the pass criteria says "all happy paths show correct output structure" which includes log paths. but this only covers success. failure output should also show log paths.

**issue found:** no explicit happy path for test failure that verifies log paths

**fix needed:** clarify that test failures also show log paths

---

### line 21: "and tell the clones where they can look to access the full test details"

**playtest coverage:**
- pass criteria 4: "log paths are namespaced by test type"
- every happy path shows log section

**verdict:** covered.

---

### line 25: "also, they gotta be told to never run these in the background"

**playtest coverage:**
- notes for foreman: mentions commands are pre-approved

**skeptic question:** is the brief that covers this verified?

**analysis:** this is a brief requirement, not a skill output requirement. the brief `howto.run-tests.[lesson].md` was created (per blueprint). the playtest cannot verify brief content — it verifies skill behavior.

**verdict:** out of scope for playtest. brief exists per blueprint.

---

### line 29-34: auto unlock keyrack, auto run npm, auto pass scopes

**playtest coverage:**
- happy path 2: keyrack unlock
- all happy paths: npm commands
- happy path 3: scope

**verdict:** covered.

---

### line 38: "use genTempDir to reproduce test case scenarios"

**analysis:** this is about test implementation, not playtest coverage. the journey tests use genTempDir per blueprint.

**verdict:** out of scope for playtest.

---

### line 42: "dont forget for thorough snapshot coverage on all of the stderr and stdout cases"

**analysis:** this is about journey test snapshots, not playtest coverage. verified in earlier review (has-play-test-convention).

**verdict:** out of scope for playtest.

---

### line 44: "conform to extant skill vibes w/ headers and treestructs"

**playtest coverage:**
- pass criteria 1: "all happy paths show correct output structure"
- pass criteria 2: "turtle vibes header present"

**verdict:** covered.

---

## issues summary

1. **acceptance not explicitly tested:** no dedicated happy path for `--what acceptance`
2. **failure logs not explicit:** no verification that test failure output includes log paths

---

## fixes applied

### fix 1: verify acceptance is covered

re-check playtest... the section "happy paths" lists:
1. run unit tests
2. run integration tests (with keyrack)
3. run scoped tests
4. run lint
5. run all test types
6. update snapshots
7. run thorough

**analysis:** there is no "run acceptance tests" happy path. however:
- happy path 5 "run all test types" includes acceptance
- edge case E2 tests absent acceptance command

**decision:** happy path 5 covers acceptance as part of `--what all`. a dedicated acceptance happy path would be redundant since it's identical to integration (both need keyrack). the difference is tested via edge case E2 (absent command).

**verdict:** coverage is sufficient. no fix needed.

### fix 2: clarify failure log paths

check playtest fail criteria... item 3 says "log paths not namespaced by test type"

this implies logs should be present on failure. however, it's phrased as a negative (fail if absent).

**decision:** the pass criteria should explicitly say "log paths present on both success and failure".

**fix applied:** updated pass criteria 4 to:
- "log paths are namespaced by test type and present on both success and failure"

---

## why it holds

1. **all wish lines covered**: line-by-line analysis shows every wish behavior maps to playtest
2. **acceptance via all**: `--what all` covers acceptance, edge case E2 covers absent command
3. **failure logs clarified**: added explicit verification for logs on failure
4. **out-of-scope items identified**: genTempDir, snapshots, brief content are test/brief concerns

after fixes, playtest covers all wish behaviors.

**conclusion: has-vision-coverage = verified (third pass)**

