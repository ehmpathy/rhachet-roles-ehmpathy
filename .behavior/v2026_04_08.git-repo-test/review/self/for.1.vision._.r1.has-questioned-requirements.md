# review.self: has-questioned-requirements

i questioned each requirement in the vision. for each, i asked:
- who said this was needed? when? why?
- what evidence supports this requirement?
- what if we didn't do this — what would happen?
- is the scope too large, too small, or misdirected?
- could we achieve the goal in a simpler way?

---

## requirement 1: `--what unit | integration | acceptance`

**who said?** the wish, explicitly: "extend git.repo.test in order to support --what unit | integration | acceptance"

**evidence?** wish directly states this as the core ask. the extant skill only supports `--what lint`.

**what if we didn't?** clones continue to fumble with npm/jest quirks. every repo has slightly different test commands. clones burn tokens and make mistakes:
- forgetting the `--` separator
- confusing jest flags with npm flags
- not knowing if it's `test:unit` or `test-unit` or `unit-test`

**is the scope right?** yes - unit, integration, acceptance are the standard test scopes in ehmpathy repos. adding types/format would be scope creep (those are lint concerns, already covered).

**simpler way?** no - this IS the simple way. the complexity is hidden inside the skill. the alternative (clones learn each repo's quirks) is much worse.

**why it holds:** this is the core value proposition. the wish explicitly requests it. the pain is real and well-documented (clones frequently get test commands wrong). the scope is correct (unit/integration/acceptance map to standard npm commands).

**verdict:** ✓ holds. core requirement from wish.

---

## requirement 2: `--scope` for filter

**who said?** the wish: "make it easy to --scope to custom subsets via paths and test names"

**evidence?** wish explicitly mentions both "paths" and "test names" as scope targets.

**what if we didn't?** clones run all tests when they only need one, which wastes time. a clone debugging one test shouldn't wait for 200 tests to run.

**is the scope right?** i initially proposed TWO flags: `--scope` for paths and `--scope-name` for test names. but this is over-engineered:
- most test runs scope by file path (more common)
- test name filter is rare
- two flags add complexity to the interface
- jest's `--testPathPattern` handles 90% of cases

**simpler way?** yes! just `--scope` for file paths. for the rare test name filter case, users can pass raw jest args via `--`. this is simpler and covers all cases.

**what i changed:** removed `--scope-name` from the vision. updated contract to show `--` passthrough for advanced cases.

**why it holds:** scope filter is explicitly requested in wish. file path scope covers the common case. `--` passthrough handles edge cases without bloating the interface.

**lesson learned:** i initially over-engineered this. questioning the requirement helped me see the simpler solution.

**verdict:** ✓ holds (simplified).

---

## requirement 3: `--resnap`

**who said?** the wish: "make it easy to --resnap snapshots"

**evidence?** wish explicitly mentions this as a key pain point.

**what if we didn't?** clones fumble with `RESNAP=true` vs `--updateSnapshot` vs `npm run test:unit -- -u`. different repos use different conventions. this is exactly the kind of quirk the skill should hide.

**is the scope right?** yes - just a boolean flag. no parameters needed. the skill sets `RESNAP=true` env var which works across ehmpathy repos.

**simpler way?** no - a boolean flag is already minimal. could use `-u` as shorthand, but `--resnap` is clearer and matches the turtle vibes vocabulary.

**why it holds:** explicit requirement from wish. real pain point (clones get this wrong often). minimal interface (just a flag). maps cleanly to extant convention (`RESNAP=true`).

**verdict:** ✓ holds. explicit requirement.

---

## requirement 4: `--thorough` (REMOVED)

**who said?** ME. the wish does NOT mention this.

**evidence?** i saw `THOROUGH=true` in the pre-approved permission patterns and assumed it should be part of the skill. but assumptions are not requirements.

**what if we didn't?** clones who need thorough mode can:
1. use `THOROUGH=true npm run test:unit` directly (already pre-approved)
2. pass via `--`: `rhx git.repo.test --what unit -- --THOROUGH=true`

**is the scope right?** NO. this was scope creep. the wish didn't ask for it. adding it bloats the interface without explicit need.

**simpler way?** yes - don't add it at all. YAGNI (you aren't gonna need it). if it becomes needed later, add it then.

**what i changed:** removed `--thorough` from the vision contract, usecases, and pit-of-success table.

**lesson learned:** i was proactively adding features not requested. the wish is the scope. question everything outside the wish.

**verdict:** ✗ removed. scope creep not in wish.

---

## requirement 5: auto keyrack unlock

**who said?** the wish: "auto unlock keyracks"

**evidence?** wish explicitly mentions this as a goal: "auto unlock keyracks".

**what if we didn't?** integration tests fail for clones who forget to unlock. the clone hits a cryptic "credential is locked" error, has to figure out what went wrong, run the unlock command, then retry. this is friction that should be hidden.

**is the scope right?** i initially proposed different envs for different test types:
- integration → `test` env
- acceptance → `prep` env

but this adds complexity. is it needed? reviewing the briefs:
- `howto.keyrack.[lesson].md` says "always use `--owner ehmpath`"
- no mention of different envs for different test types

**simpler way?** yes - always unlock `test` env. this is simpler and probably correct. if acceptance tests truly need `prep` credentials, that's a future enhancement once we have evidence.

**what i changed:** updated vision to always use `test` env, not inferred per test type.

**why it holds:** explicit requirement from wish. real pain point (clones forget to unlock). auto-unlock with visible output is the right tradeoff (not surprising, just helpful).

**verdict:** ✓ holds (simplified).

---

## requirement 6: log capture on success AND failure

**who said?** the wish: "stream the full test results into a .log/.../ dir... both on success and failure"

**evidence?** wish explicitly says "both on success and failure". also: "tell the clones where they can look to access the full test details".

**what if we didn't?**
- clones can't diagnose intermittent issues (test passed but why?)
- clones can't verify what actually ran (did the scope filter work?)
- clones debugging flaky tests have no history to compare

the extant skill only logs on failure. this is insufficient per the wish.

**is the scope right?** yes - log on BOTH success and failure. the wish is explicit about this.

**question raised:** should output stream live to terminal, or just capture to log?
- wish says "stream" which implies live output
- but capture to log is also needed for later diagnosis

**simpler way?** could do one or the other, but that's worse:
- capture only → clone doesn't see live progress
- stream only → clone can't review later

**resolution:** use `tee` to do BOTH. stream live to terminal AND capture to log file. this is the unix way. best of both worlds.

**what i changed:** updated vision to clarify: stream live AND capture (via tee).

**why it holds:** explicit requirement from wish. "both on success and failure" is unambiguous. `tee` pattern is simple and well-understood.

**verdict:** ✓ holds (clarified).

---

## requirement 7: tell clones where logs are

**who said?** the wish: "tell the clones where they can look to access the full test details"

**evidence?** wish explicitly mentions this as a separate concern from just capturing logs.

**what if we didn't?** clones wouldn't know where to look. the log file exists but the clone has to guess the path. this defeats the purpose of capturing logs.

**is the scope right?** yes - show the log path in every output. the vision shows this in both success and failure outputs.

**simpler way?** could use a fixed path (e.g., `.log/latest.log`) with symlink. but timestamped files are more valuable (history, comparison). showing the full path is already simple enough.

**could we not show it on success?** i considered this - success output might be noisy with the log path. but consistency matters more than terseness. clones should always know where to look, regardless of outcome.

**why it holds:** explicit requirement from wish. the vision already does this correctly (log path in every output). no change needed.

**verdict:** ✓ holds. explicit requirement.

---

## requirement 8: brief about foreground execution

**who said?** the wish: "they gotta be told to never run these in the background"

**evidence?** wish explicitly mentions this as a separate deliverable: "add a brief that covers this and how to run tests".

**what if we didn't?** clones run tests in background (using `run_in_background: true` or `&`) and:
- miss the live output
- don't notice failures until later
- can't interact with watch mode
- lose context when the test finishes

**is the scope right?** the wish asks for a brief, not just skill behavior. this is correct because:
- the brief teaches clones WHY foreground matters
- the brief covers broader test running patterns
- the skill can't prevent background execution (that's up to the caller)

**simpler way?** no - a brief is the right artifact. could add a warning in the skill if it detects background execution, but that's over-engineering.

**what needs to happen:** create a brief (not in vision yet) that teaches:
- always run tests in foreground
- how to use `git.repo.test` skill
- common patterns and examples

**why it holds:** explicit requirement from wish. brief is the correct artifact for teaching clones.

**verdict:** ✓ holds. explicit requirement. need to note: brief creation is a separate deliverable.

---

---

## summary of changes made to vision

| requirement | action | reason |
|-------------|--------|--------|
| `--what unit\|integration\|acceptance` | ✓ kept | core ask from wish, explicit |
| `--scope` | ✓ simplified | removed `--scope-name`, use `--` for advanced cases |
| `--resnap` | ✓ kept | explicit requirement, minimal interface |
| `--thorough` | ✗ removed | scope creep, not in wish |
| auto keyrack | ✓ simplified | always `test` env, not inferred |
| log capture | ✓ clarified | stream live AND capture (via tee) |
| show log path | ✓ kept | explicit requirement, already correct |
| foreground brief | ✓ kept | explicit requirement, separate deliverable |

## lessons learned

1. **question everything outside the wish.** i added `--thorough` because i saw it in permissions. but permissions are not requirements. removed it.

2. **simpler is better.** i proposed `--scope` + `--scope-name` but just `--scope` with `--` passthrough is simpler and covers all cases.

3. **don't infer complexity.** i assumed keyrack env should vary by test type. but no evidence supports this. always `test` is simpler.

4. **wish is the scope.** all core requirements came from the wish. the wish is explicit about what it wants. trust it.

## what holds and why

all core requirements from the wish hold because:
- they address real pain points (clones fumble with npm/jest quirks)
- they are explicitly requested (wish is clear and specific)
- they have minimal interfaces (no bloat)
- they follow extant patterns (tee, keyrack, turtle vibes)
