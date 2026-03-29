# review: role-standards-coverage (r8)

## approach

checked that all applicable mechanic role standards are covered in the implementation. used same directory enumeration as adherance review, then verified each required pattern is present (not just that violations are absent).

### directories checked

| directory | applicable? | why |
|-----------|-------------|-----|
| code.prod/pitofsuccess.errors/ | yes | error standards |
| code.prod/readable.comments/ | yes | documentation standards |
| code.prod/readable.narrative/ | yes | code structure standards |
| code.test/frames.behavior/ | yes | test structure standards |
| lang.terms/ | yes | vocabulary standards |
| lang.tones/ | yes | tone standards |

other directories (domain.objects, procedures, typedefs) do not apply to bash shell hooks.

### confirmation: no rule categories omitted

verified by grep:
- `ls src/domain.roles/mechanic/briefs/practices/` shows 5 top-level categories
- code.prod/, code.test/, lang.terms/, lang.tones/, work.flow/
- all reviewed above; work.flow/ (release, terraform, tools) does not apply to code standards

## files reviewed

### line-by-line walkthrough: pretooluse.forbid-tmp-writes.sh

| lines | content | standard checked |
|-------|---------|------------------|
| 1-2 | shebang, comment block | N/A (boilerplate) |
| 3 | `# .what = PreToolUse hook to block writes to /tmp/*` | what-why-headers |
| 5-6 | `# .why = /tmp is not actually temporary...` | what-why-headers |
| 9-11 | `# .how = reads JSON from stdin...` | what-why-headers |
| 14 | `set -euo pipefail` | fail-fast (bash strict mode) |
| 25-31 | read stdin, guard if empty | fail-fast (early exit) |
| 33-38 | extract tool_name, guard if not Write/Edit/Bash | fail-fast (early exit) |
| 42-61 | Write/Edit path check, block or exit 0 | narrative-flow (paragraph), exit-code-semantics |
| 64-69 | extract command, guard if empty | fail-fast (early exit) |
| 72-94 | detection patterns (redirect, tee, cp, mv) | narrative-flow (paragraphs) |
| 97-108 | block message and exit 2 | exit-code-semantics |
| 111-112 | allow (exit 0) | exit-code-semantics |

no `else` or `elif` found in any conditional (grep confirms).

| file | lines | coverage check |
|------|-------|----------------|
| pretooluse.forbid-tmp-writes.sh | 113 | prod code standards |
| pretooluse.forbid-tmp-writes.integration.test.ts | 397 | test code standards |

### line-by-line walkthrough: pretooluse.forbid-tmp-writes.integration.test.ts

| lines | content | standard checked |
|-------|---------|------------------|
| 1-10 | imports (test-fns, path, child_process) | N/A (setup) |
| 12-35 | describe block, runHook helper | jest-integration |
| 37-115 | case1: Write tool to /tmp | given-when-then |
| 117-162 | case2: Edit tool to /tmp | given-when-then |
| 164-214 | case3: Bash redirect to /tmp | given-when-then |
| 216-252 | case4: Bash tee to /tmp | given-when-then |
| 254-290 | case5: Bash cp to /tmp | given-when-then |
| 292-324 | case6: Bash mv to /tmp | given-when-then |
| 326-356 | case7: Bash read operations (allow) | given-when-then |
| 358-388 | case8: path edge cases | given-when-then |
| 390-410 | case9: error cases (empty stdin) | given-when-then |
| 412-450 | case10: guidance message verification | given-when-then |
| 452-470 | case11: snapshot test | snapshots |

all 11 given blocks use [caseN] labels. all when blocks use [tN] labels.

## coverage check: hook file

### required: .what/.why headers

**standard:** rule.require.what-why-headers

**coverage:**
```bash
# .what = PreToolUse hook to block writes to /tmp/*
#
# .why  = /tmp is not actually temporary - it persists indefinitely
#         and never auto-cleans. use .temp/ instead, which is scoped
#         to the repo and gitignored.
#
# .how  = reads JSON from stdin, checks file_path or command for
#         /tmp write patterns, blocks with guidance message.
```

**verdict**: covered. all three headers present with clear content.

### required: fail-fast guards

**standard:** rule.require.fail-fast

**coverage:**
- lines 28-31: empty stdin guard with exit 2
- lines 36-39: non-Write/Edit/Bash tool guard with exit 0
- lines 68-70: empty command guard with exit 0

**verdict**: covered. three guard clauses at top of hook.

### required: exit code semantics

**standard:** rule.require.exit-code-semantics

**coverage:**
- exit 0 used for allow (lines 38, 61, 69, 112)
- exit 2 used for block (lines 30, 57, 108)
- no exit 1 (correct - no malfunctions, only constraints)

**verdict**: covered. semantic exit codes used throughout.

### required: narrative flow

**standard:** rule.require.narrative-flow

**coverage:**
- 7 paragraphs, each with prior comment
- no nested if blocks
- early exit pattern used
- blank lines separate paragraphs

**verdict**: covered. flat linear structure.

### required: no else branches

**standard:** rule.forbid.else-branches

**coverage:**
- grep for "else" in hook file: no matches
- all conditionals use early exit

**verdict**: covered. no else or elif used.

## coverage check: test file

### required: jest integration tests

**standard:** rule.require.jest-tests-for-skills

**coverage:**
- file extension: `.integration.test.ts`
- uses jest: `describe`, `expect`, `it`
- uses test-fns: `given`, `when`, `then`

**verdict**: covered.

### required: given-when-then structure

**standard:** rule.require.given-when-then

**coverage:**
- 11 given blocks with [caseN] labels
- each given has when blocks with [tN] labels
- each when has then blocks with assertions

**verdict**: covered. BDD structure throughout.

### required: no remote boundaries in unit tests

**standard:** rule.forbid.remote-boundaries

**coverage:**
- this is an integration test, not a unit test
- runs actual bash hook via spawnSync
- no mocks, tests real behavior

**verdict**: N/A (integration test, not unit test). standard correctly applied.

## why it holds

### no absent standards

| required standard | present? | evidence |
|-------------------|----------|----------|
| .what/.why headers | yes | lines 1-20 |
| fail-fast guards | yes | lines 28-31, 36-39, 68-70 |
| exit code semantics | yes | 0/2 used correctly |
| narrative flow | yes | 7 paragraphs |
| no else branches | yes | grep confirms |
| jest integration tests | yes | .integration.test.ts |
| given-when-then | yes | test-fns used |

### no omitted patterns

all standards relevant to bash shell hooks are covered. patterns not present (e.g., typescript-specific rules, domain object rules) correctly do not apply.

## conclusion

implementation covers all applicable mechanic role standards. the hook has:
1. required documentation headers
2. required fail-fast guards
3. required exit code semantics
4. required code structure (narrative flow, no else)
5. required test structure (jest, BDD)

no gaps found.
