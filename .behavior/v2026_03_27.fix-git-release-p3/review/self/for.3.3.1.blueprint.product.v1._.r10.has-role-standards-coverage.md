# review: has-role-standards-coverage (r10)

checked blueprint for coverage of mechanic role standards. enumerated relevant rule directories, then checked for absent patterns.

---

## rule directories enumerated

searched `.agent/repo=ehmpathy/role=mechanic/briefs/practices/` for rule categories relevant to this blueprint.

relevant mechanic briefs directories for this blueprint:

| directory | why relevant |
|-----------|--------------|
| `lang.terms/` | function names, variables, term conventions |
| `lang.tones/` | emoji, output vibes |
| `code.prod/evolvable.procedures/` | contracts, args patterns |
| `code.prod/evolvable.repo.structure/` | file locations |
| `code.prod/pitofsuccess.errors/` | exit codes, fail-fast, error wrap |
| `code.prod/pitofsuccess.procedures/` | idempotency |
| `code.test/frames.behavior/` | bdd test structure |
| `code.test/lessons.howto/` | snapshot, integration tests |
| `work.flow/diagnose/` | test-covered repairs |

---

## check 1: error wrap (absent vs present)

**brief**: `.agent/repo=ehmpathy/role=mechanic/briefs/practices/code.prod/pitofsuccess.errors/rule.prefer.helpful-error-wrap.md`

**rule states**: "wrap errors for observability"

**search conducted**: scanned blueprint for gh cli calls and error handle patterns

| blueprint element | gh call? | error handle? |
|-------------------|----------|---------------|
| get_fresh_release_pr() | yes: `gh pr list` | via _gh_with_retry |
| get_fresh_release_tag() | no: `git fetch` | shell exit codes |
| get_release_please_status() | yes: `gh run list` | via _gh_with_retry |

**blueprint evidence**:
- line 78: `[○] _gh_with_retry()  # retain: used by all gh calls`
- lines 56-59: get_fresh_release_pr uses gh pr list
- lines 71-76: get_release_please_status uses gh run list

**why this holds**:
- the blueprint explicitly retains `_gh_with_retry` (line 78)
- this function is the extant error wrap pattern for all gh cli calls
- new operations (get_fresh_release_pr, get_release_please_status) will compose with it
- no new gh calls bypass this mechanism — the blueprint routes all gh calls through retained infrastructure
- git commands (fetch, merge-base) use standard shell exit code propagation, which is sufficient for their failure modes

**verdict**: not absent — covered by retained mechanism `_gh_with_retry`.

---

## check 2: idempotency (absent vs present)

**brief**: `.agent/repo=ehmpathy/role=mechanic/briefs/practices/code.prod/pitofsuccess.procedures/rule.require.idempotent-procedures.md`

**rule states**: "procedures idempotent unless marked; handle twice no double effects"

**search conducted**: traced each new function for state mutations

| function | reads | writes | idempotent? |
|----------|-------|--------|-------------|
| and_then_await() | gh api, git state | stdout only | yes |
| get_fresh_release_pr() | gh pr list | none | yes |
| get_fresh_release_tag() | git fetch, git rev-parse | none | yes |
| get_release_please_status() | gh run list | none | yes |
| print_await_poll() | none | stdout | yes |
| print_await_result() | none | stdout | yes |
| print_workflow_status() | none | stdout | yes |

**why this holds**:
- all new functions are read operations: they query state but don't mutate it
- the poll loop in and_then_await re-checks the same condition each iteration — calling twice yields same result
- stdout emission is inherently idempotent: emit same line twice = duplicate output, no state corruption
- git fetch is idempotent: fetches same refs, no mutation if already present
- gh api queries are read-only: list operations, not create/update/delete
- no databases, no external mutations, no side effects beyond stdout
- the rule requires idempotency unless marked — these functions need no marking because they're naturally idempotent

**verdict**: not absent — functions are read-only, inherently idempotent.

---

## check 3: test coverage (absent vs present)

**brief**: `.agent/repo=ehmpathy/role=mechanic/briefs/practices/code.test/lessons.howto/howto.write.[lesson].md`

**rule states**: "add .integration.test.ts file (collocated), never mock"

**search conducted**: checked blueprint for test file and coverage

**blueprint evidence**:
- line 23: `[+] git.release.p4.and_then_await.integration.test.ts`
- lines 117-187: 18 test cases documented in describe/given/then structure

**test case coverage**:

| range | count | coverage |
|-------|-------|----------|
| cases 1-4 | 4 | found scenarios (immediate + after wait) |
| cases 5-10 | 6 | stale rejection (both transports) |
| cases 11-18 | 8 | timeout with workflow status variants |

**why this holds**:
- blueprint line 23 explicitly adds the integration test file
- file name follows extant pattern: `git.release.p4.*.integration.test.ts` (matches p1, p2, p3)
- 18 cases cover the complete test matrix from wish:
  - 2 transports (release-pr, tag) x 3 outcomes (found-immediate, found-after-wait, timeout)
  - 4 workflow statuses on timeout (failed, in_progress, passed, not_found)
  - 6 stale rejection scenarios (critical regression)
- no mock is used: blueprint line 188-211 specifies PATH injection pattern with fake bin, not jest.mock
- test file is collocated: same directory as git.release.sh

**verdict**: not absent — test file specified with comprehensive coverage.

---

## check 4: snapshot tests (absent vs present)

**brief**: `.agent/repo=ehmpathy/role=mechanic/briefs/practices/code.test/lessons.howto/rule.require.snapshots.[lesson].md`

**rule states**: "use snapshots for output artifacts... easier review in prs of produced artifacts"

**search conducted**: searched blueprint test spec for snapshot mentions

| search term | found? | location |
|-------------|--------|----------|
| `toMatchSnapshot` | no | - |
| `snapshot` | no | - |
| output shapes | yes | lines 249-279 |

**blueprint evidence**:
- lines 249-279 define expected output shapes (found immediately, found after wait, timeout)
- test cases (lines 117-187) specify assertions but not snapshot method

**why this requires note**:
- rule states snapshots are required for output artifacts
- this blueprint produces stdout output (the poll UI, timeout diagnostics)
- extant git.release tests (p1, p2, p3) use `expect(result.stdout).toMatchSnapshot()`
- blueprint test cases document assertions but don't explicitly mention snapshot
- implementation should add `toMatchSnapshot()` per standard practice

**action required**: implementation must use `expect(output).toMatchSnapshot()` alongside explicit assertions.

**verdict**: gap noted — snapshot usage not specified in blueprint, but required by standard. noted for implementation phase.

---

## check 5: useThen pattern (absent vs present)

**brief**: `.agent/repo=ehmpathy/role=mechanic/briefs/practices/code.test/frames.behavior/rule.require.useThen-useWhen-for-shared-results.md`

**rule states**: "use useThen and useWhen from test-fns to capture operation results and share across blocks without let"

**search conducted**: analyzed blueprint test structure for shared results

**test case pattern** (from blueprint lines 117-187):
```
given('[caseN] scenario')
  └── then('assertion 1')
  └── then('assertion 2')
```

**why useThen is not needed**:
- each given block represents one scenario
- each then block asserts on the same operation result
- no redundant expensive operations: the operation runs once per given
- no let declarations: each then asserts on captured scenario state
- no peer blocks that need shared results from a prior when

**rule applies when**: multiple then blocks need to share a result from an expensive operation, or multiple when blocks need to track state across sequential actions.

**blueprint pattern**: each test case (given) invokes the operation once. multiple then blocks assert on different aspects of the same result. this is standard given/then structure, not the shared-result pattern that requires useThen.

**verdict**: not needed — test cases don't share results across peer blocks.

---

## check 6: type declarations (absent vs present)

**brief**: `.agent/repo=ehmpathy/role=mechanic/briefs/practices/code.prod/evolvable.procedures/rule.require.clear-contracts.md`

**rule states**: "declare behavior shape and expectations before implementation"

**search conducted**: checked blueprint for contract declarations

**blueprint evidence**:
- lines 227-235: contracts table

| input | type | description |
|-------|------|-------------|
| artifact_type | `release-pr` or `tag` | which artifact to await |
| artifact_display | string | display name for timeout |
| prior_merge_commit | sha | merge commit for freshness |

| output | exit code | stdout | AWAIT_RESULT |
|--------|-----------|--------|--------------|
| found immediately | 0 | `🫧` + blank | artifact json |
| found after wait | 0 | `🫧` + `💤` + `✨` | artifact json |
| timeout | 2 | `🫧` + `💤` + `⚓` + `🔴` | empty |

**why this holds**:
- blueprint declares inputs (line 227-231) with types and descriptions
- blueprint declares outputs (line 233-235) with exit codes and stdout shapes
- shell scripts use different type system: args, exit codes, stdout shapes
- the table format is appropriate for shell contracts (not typescript interfaces)
- contracts are declared before implementation details in blueprint structure
- freshness check contract documented separately (lines 237-244)

**verdict**: not absent — contracts declared in blueprint. shell scripts use args/exit-codes/stdout as type system.

---

## check 7: validation (absent vs present)

**brief**: `.agent/repo=ehmpathy/role=mechanic/briefs/practices/code.prod/pitofsuccess.errors/rule.require.fail-fast.md`

**rule states**: "validate inputs at system boundaries... only validate at system boundaries"

**search conducted**: traced input flow to and_then_await

**input flow**:
```
git.release.sh (entry point, user input)
  └── and_then_await artifact_type artifact_display prior_merge_commit
        ├── artifact_type: hardcoded "release-pr" or "tag"
        ├── artifact_display: hardcoded "release pr" or "tag v$version"
        └── prior_merge_commit: from gh pr view --json mergeCommit
```

**why validation is not needed**:
- caller (git.release.sh) is internal trusted code, not a system boundary
- artifact_type is hardcoded at call sites: `and_then_await "release-pr" ...`
- artifact_display is constructed from trusted state: `"tag v$version"`
- prior_merge_commit comes from gh api response (already validated by gh cli)
- rule says "only validate at system boundaries" — internal calls don't need validation
- user input enters at git.release.sh CLI parsing, which is already validated

**contrast with boundary validation**:
- CLI args (--into, --apply) validated at git.release.sh entry
- gh api responses have known structure, not user-controlled
- and_then_await receives pre-validated internal state

**verdict**: not absent — internal calls don't require input validation per rule.

---

## check 8: comment headers (absent vs present)

**brief**: `.agent/repo=ehmpathy/role=mechanic/briefs/practices/code.prod/readable.comments/rule.require.what-why-headers.md`

**rule states**: "require jsdoc .what and .why for every named procedure"

**search conducted**: checked blueprint for header specifications

**blueprint evidence**:
- lines 32-34 show function signature but no header spec
- blueprint is a design doc, not implementation code

**why this is implementation detail**:
- blueprints declare what functions do, not how they're documented
- the rule applies to implementation code, not design docs
- blueprint already captures .what (via function descriptions) and .why (via narrative)
- implementation must add bash comment headers:

```bash
# .what = await next transport artifact with commit-based freshness
# .why = prevents stale artifacts from prior runs; surfaces actionable diagnostics on timeout
```

**action required**: implementation must include .what/.why headers per rule.

**verdict**: implementation detail — noted for implementation phase.

---

## check 9: test infra reuse (absent vs present)

**brief**: `.agent/repo=.this/role=any/briefs/howto.mock-cli-via-path.[lesson].md`

**rule states**: "mock external CLI tools by prepend a fake bin directory to PATH"

**search conducted**: checked blueprint for test infra pattern

**blueprint evidence**:
- lines 193-211 specify test infra patterns
- line 198-199: mockGh for gh api responses
- line 201-208: git mock for freshness check via ancestor result file

**test infra pattern** (from blueprint):
```typescript
// git mock for freshness check
fs.writeFileSync(path.join(fakeBinDir, 'git'), `#!/bin/bash
if [[ "$1" == "merge-base" && "$2" == "--is-ancestor" ]]; then
  exit $(cat "$STATE_DIR/ancestor_result" 2>/dev/null || echo 0)
fi
exec /usr/bin/git "$@"
`);
```

**why this holds**:
- blueprint explicitly states "use the repeatable mockGh test infra pattern from extant git.release tests" (line 188-189)
- no new mock framework introduced — reuses extant PATH injection pattern
- git mock follows same pattern: fake bin, pass-through for unhandled commands
- extant tests (p1, p2, p3) use identical pattern with mockGh
- the howto lesson is followed: prepend fake bin to PATH, not jest.mock

**verdict**: not absent — test infra reuse specified.

---

## check 10: test-covered repairs (absent vs present)

**brief**: `.agent/repo=ehmpathy/role=mechanic/briefs/practices/work.flow/diagnose/rule.require.test-covered-repairs.md`

**rule states**: "every defect fix must include a test that covers the defect"

**search conducted**: traced defect from wish to test cases

**the defect** (from wish):
> "we instantly check and find OLD release pr, since new release pr takes ~60sec to populate"
> "we must reproduce that failure case before the fix"

**blueprint test coverage for defect**:

| case | scenario | defect reproduction |
|------|----------|---------------------|
| 5 | stale release-pr rejected | OLD pr found, M1 not ancestor → rejected |
| 6 | stale then fresh release-pr | OLD pr rejected, new appears → accepted |
| 7 | stale then timeout | OLD pr rejected, none fresh → timeout |
| 8 | stale tag rejected | OLD tag found, M2 not ancestor → rejected |
| 9 | stale then fresh tag | OLD tag rejected, new appears → accepted |
| 10 | stale then timeout | OLD tag rejected, none fresh → timeout |

**blueprint evidence**:
- lines 133-155: "critical regression" test cases
- line 133: describes stale artifact scenario
- test cases 5-10 explicitly cover stale artifact rejection

**why this holds**:
- the core defect is stale artifact acceptance
- test cases 5-10 reproduce this exact scenario:
  1. old artifact exists (from prior merge)
  2. new merge occurs (M1 created)
  3. and_then_await checks for artifact
  4. bug behavior: OLD artifact accepted → flow continues with stale data
  5. fix behavior: OLD artifact rejected (M1 not ancestor) → poll continues
- the test matrix covers both transports (release-pr, tag) and both outcomes (fresh appears, timeout)
- this is explicitly called out as "critical regression" in blueprint

**verdict**: not absent — regression tests specified for the core defect.

---

## gaps summary

| check | aspect | status | resolution |
|-------|--------|--------|------------|
| 1 | error wrap | covered by _gh_with_retry | no gap |
| 2 | idempotency | functions are read-only | no gap |
| 3 | test file | specified (18 cases) | no gap |
| 4 | snapshots | not mentioned | impl: use toMatchSnapshot |
| 5 | useThen | not needed | no gap |
| 6 | type contracts | declared in table | no gap |
| 7 | input validation | not needed (internal) | no gap |
| 8 | comment headers | impl detail | impl: add .what/.why |
| 9 | test infra reuse | specified | no gap |
| 10 | test-covered repairs | specified (cases 5-10) | no gap |

---

## conclusion

**rule directories checked**: 9
**standards covered**: 8
**standards with gaps**: 2 (both are implementation details, not blueprint gaps)

**implementation notes**:
1. **snapshots**: tests must use `toMatchSnapshot()` alongside explicit assertions
2. **comment headers**: functions must have `.what` and `.why` bash comment headers

the blueprint covers all required mechanic standards. the two gaps are implementation details that don't require blueprint changes — they are noted for the implementation phase.

