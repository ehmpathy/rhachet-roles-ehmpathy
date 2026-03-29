# review: role-standards-adherance (r7)

## approach

searched mechanic role briefs under `src/domain.roles/mechanic/briefs/practices/` for rules that apply to shell skills and hooks.

### directories checked

| directory | applicable? | why |
|-----------|-------------|-----|
| code.prod/consistent.artifacts/ | no | pinned-versions is for npm packages |
| code.prod/consistent.contracts/ | no | as-command is for typescript |
| code.prod/evolvable.architecture/ | no | bounded-contexts, ddd are for typescript modules |
| code.prod/evolvable.domain.objects/ | no | domain-objects rules are for typescript |
| code.prod/evolvable.domain.operations/ | no | operation verbs are for typescript |
| code.prod/evolvable.procedures/ | partial | positional-args, input-context apply loosely; arrow-only is typescript |
| code.prod/evolvable.repo.structure/ | no | barrel-exports, directional-deps are for typescript |
| code.prod/pitofsuccess.errors/ | yes | fail-fast, exit-code-semantics apply to shell |
| code.prod/pitofsuccess.procedures/ | partial | idempotent-procedures applies; immutable-vars is typescript |
| code.prod/pitofsuccess.typedefs/ | no | typescript types only |
| code.prod/readable.comments/ | yes | what-why-headers applies to shell |
| code.prod/readable.narrative/ | yes | narrative-flow, forbid-else-branches apply to shell |
| code.prod/readable.persistence/ | no | declastruct is for typescript |
| code.test/frames.behavior/ | yes | given-when-then applies to test file |
| code.test/scope.unit/ | no | unit test rules; this is integration test |
| lang.terms/ | yes | gerunds, treestruct apply to all code |
| lang.tones/ | yes | lowercase, buzzwords apply to comments |
| work.flow/ | no | release, terraform, tools are not code standards |

### rules extracted for review

from applicable directories, extracted 8 rules to check:
1. rule.require.jest-tests-for-skills (code.test)
2. rule.require.exit-code-semantics (pitofsuccess.errors)
3. rule.require.fail-fast (pitofsuccess.errors)
4. rule.require.what-why-headers (readable.comments)
5. rule.forbid.gerunds (lang.terms)
6. rule.prefer.lowercase (lang.tones)
7. rule.require.narrative-flow (readable.narrative)
8. rule.forbid.else-branches (readable.narrative)

## files reviewed

| file | purpose | standards checked |
|------|---------|-------------------|
| pretooluse.forbid-tmp-writes.sh (113 lines) | hook implementation | 8 rules below |
| pretooluse.forbid-tmp-writes.integration.test.ts (397 lines) | test suite | jest-tests-for-skills |

## mechanic role standards check

### rule.require.jest-tests-for-skills

**brief says:** all skills must be tested via jest `.integration.test.ts` files

**implementation:**
- file: `pretooluse.forbid-tmp-writes.integration.test.ts`
- uses jest (via `describe`, `expect`)
- uses test-fns (`given`, `when`, `then`)
- 37+ test cases

**adherance**: yes.

### rule.require.exit-code-semantics

**brief says:**
| code | meaning |
|------|---------|
| 0 | success |
| 1 | malfunction |
| 2 | constraint |

**implementation:**
- exit 0 for allow (lines 38, 61, 69, 112)
- exit 2 for block (lines 30, 57, 108)
- no exit 1 used (correct, since blocks are constraints, not malfunctions)

**adherance**: yes.

### rule.require.fail-fast

**brief says:** enforce early exits and HelpfulError for invalid state

**implementation:**
- lines 28-31: failfast on empty stdin (exit 2)
- lines 36-39: early exit if not Write/Edit/Bash
- lines 68-70: early exit if no command

**adherance**: yes. three early exit guards at top of hook.

### rule.require.what-why-headers

**brief says:** require .what and .why jsdoc headers

**implementation (lines 1-20):**
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

**adherance**: yes. all three headers present.

### rule.forbid.gerunds

**brief says:** gerunds forbidden in code

**implementation:**
- reviewed all comments and strings
- no gerunds detected in hook file
- test file uses "read" not "reading", etc.

**adherance**: yes.

### rule.prefer.lowercase

**brief says:** enforce lowercase for words unless code convention

**implementation:**
- all comments lowercase
- variable names: STDIN_INPUT, TOOL_NAME, FILE_PATH, COMMAND, TMP_WRITE_DETECTED
- uppercase vars follow bash convention for constants

**adherance**: yes. comments lowercase, vars follow bash convention.

### rule.require.narrative-flow

**brief says:** structure logic as flat linear code paragraphs

**implementation:**
- line 25-31: read stdin paragraph
- line 33-39: tool name check paragraph
- line 41-62: Write/Edit check paragraph
- line 64-70: command extraction paragraph
- line 72-94: detection paragraphs
- line 96-108: block message paragraph
- line 111-112: allow paragraph

each paragraph separated by blank lines, preceded by comment.

**adherance**: yes.

### rule.forbid.else-branches

**brief says:** never use else or if-else

**implementation:**
- reviewed all conditionals
- no `else` or `elif` found
- all conditionals use early exit pattern

**adherance**: yes.

## why it holds

### no deviation from role standards

| standard | implementation | verdict |
|----------|----------------|---------|
| rule.require.jest-tests-for-skills | .integration.test.ts with 37+ tests | adheres |
| rule.require.exit-code-semantics | exit 0 (allow), exit 2 (block) | adheres |
| rule.require.fail-fast | 3 early exit guards | adheres |
| rule.require.what-why-headers | .what, .why, .how present | adheres |
| rule.forbid.gerunds | no gerunds in comments/strings | adheres |
| rule.prefer.lowercase | lowercase comments, bash convention vars | adheres |
| rule.require.narrative-flow | 7 paragraphs with comments | adheres |
| rule.forbid.else-branches | no else/elif, early exit pattern | adheres |

### no unaddressed standards

all applicable standards from mechanic role briefs were checked. standards not listed above (e.g., domain object rules, typescript-specific rules) do not apply to bash shell hooks.

## conclusion

implementation follows mechanic role standards. the hook:
1. has jest integration tests
2. uses correct exit code semantics (0/2)
3. fails fast on invalid input
4. includes .what/.why/.how headers
5. avoids gerunds
6. uses lowercase comments
7. follows narrative flow with paragraphs
8. avoids else branches
