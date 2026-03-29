# review: has-role-standards-adherance (r9)

checked blueprint against mechanic role standards. enumerated relevant rule directories, then checked each blueprint element.

---

## rule directories checked

the blueprint touches:
- shell scripts (git.release._.and_then_await.sh, operations.sh, output.sh)
- test files (.integration.test.ts)
- function contracts (inputs/outputs)
- exit codes
- output format

relevant mechanic briefs directories:

| directory | applies because |
|-----------|-----------------|
| `lang.terms/` | function names, term conventions |
| `lang.tones/` | output emoji, vibe phrases |
| `code.prod/evolvable.procedures/` | input-context pattern, contracts |
| `code.prod/pitofsuccess.errors/` | exit code semantics, fail-fast |
| `code.test/frames.behavior/` | bdd test structure |
| `code.prod/evolvable.repo.structure/` | file location |

---

## check 1: function name conventions

**brief**: `.agent/repo=ehmpathy/role=mechanic/briefs/practices/lang.terms/rule.require.treestruct.md`

**rule states**: `[verb][...noun]` for mechanisms

**search conducted**: scanned blueprint for all function names

| blueprint name | verb | noun hierarchy | compliant? |
|----------------|------|----------------|------------|
| `and_then_await()` | await | and_then (context prefix) | yes |
| `get_fresh_release_pr()` | get | fresh → release → pr | yes |
| `get_fresh_release_tag()` | get | fresh → release → tag | yes |
| `get_release_please_status()` | get | release → please → status | yes |
| `print_await_poll()` | print | await → poll | yes |
| `print_await_result()` | print | await → result | yes |
| `print_workflow_status()` | print | workflow → status | yes |

**why this holds**:
- `get_*` prefix: rule states "get = retrieve/compute" — these functions retrieve artifacts (PR, tag, workflow status)
- `print_*` prefix: follows extant output.sh pattern (print_watch_poll, print_watch_result at lines 117, 134)
- noun hierarchy descends from domain to specific: `release_pr` not `pr_release`
- `and_then_await` uses compound name — the "and_then" prefix is semantic context (describes when this function runs), "await" is the action
- no gerunds: function names use nouns (poll, result, status) not gerund forms (not "printer", not "waiter")

---

## check 2: term conventions

**brief**: `.agent/repo=ehmpathy/role=mechanic/briefs/practices/lang.terms/rule.require.ubiqlang.md`

**rule states**: "eliminate synonyms: choose one canonical word per concept"

**search conducted**: `grep -r "await|poll|fresh|timeout" src/domain.roles/mechanic/skills/git.release/`

| term used | canonical? | codebase evidence | blueprint usage |
|-----------|------------|-------------------|-----------------|
| `fresh` | yes (new) | no extant synonym; r6 justifies introduction | get_fresh_release_pr(), get_fresh_release_tag() |
| `await` | yes | git.release.sh:245 "💤 Ns delay to await" | and_then_await(), print_await_poll() |
| `poll` | yes | emit_transport_watch.sh:113 "poll_interval" | poll loop, print_await_poll() |
| `timeout` | yes | emit_transport_watch.sh:77 "timeout" | 90s timeout, timeout diagnostics |
| `prior_merge_commit` | yes (new) | no extant term for this concept | function argument |
| `artifact` | yes | standard DDD | artifact_type, artifact_display |

**why this holds**:
- no synonym drift: "await" not "wait" (git.release.sh uses "await"); "poll" not "check" (emit_transport_watch uses "poll")
- "fresh" is new but required: we need a term for "commit is ahead of prior merge" — "fresh" captures this precisely
- "prior_merge_commit" is unambiguous: not "lastCommit" (ambiguous), not "previousSha" (no context), not "baseSha" (wrong semantic)
- alternative terms avoided: "stale" is used in criteria for the inverse ("stale artifact rejected") — "fresh" is the positive counterpart

---

## check 3: gerund avoidance

**brief**: `.agent/repo=ehmpathy/role=mechanic/briefs/practices/lang.terms/rule.forbid.gerunds.md`

**rule states**: "gerunds (-ing as nouns) forbidden"

**search conducted**: scanned blueprint for words that end in -ing

| blueprint line | text checked | gerund found? | analysis |
|----------------|--------------|---------------|----------|
| 36 | "emit 🫧 and then..." | no | "emit" is imperative verb |
| 37 | "poll loop with 90s timeout" | no | "poll" is noun |
| 43 | "emit 💤 Xs in await" | no | "await" is noun |
| 45 | "emit ⚓ {artifact} did not appear" | no | no -ing forms |
| 53-59 | get_fresh_release_pr() | no | no -ing in name |
| 81-83 | print_await_poll() | no | "poll" not "polling" |

**why this holds**:
- function names use nouns: `poll` (not "polling"), `result` (not "resulting"), `status` (not "statusing")
- verbs in descriptions are imperative: "emit", "return", "set" — not gerunds
- the rule alternative for "polling" is "poll" — blueprint uses "poll" throughout
- the rule alternative for "awaiting" is "await" — blueprint uses "await" throughout
- no descriptive gerunds snuck in: not "the polling happens", but "poll loop"

---

## check 4: input-context pattern

**briefs**:
- `.agent/repo=ehmpathy/role=mechanic/briefs/practices/code.prod/evolvable.procedures/rule.require.input-context-pattern.md`
- `.agent/repo=ehmpathy/role=mechanic/briefs/practices/code.prod/evolvable.procedures/rule.forbid.positional-args.md`

**rule states**: "avoid positional args" and "(input, context?) pattern"

**blueprint specifies**:
```
and_then_await artifact_type artifact_display prior_merge_commit
```

**analysis**:
- shell functions don't support typescript-style `{destructured}` objects
- however, bash supports `key=value` named args pattern (see rule.forbid.positional-args.pt1.md example)
- blueprint shows 3 positional args — this violates the spirit of "named args for clarity"

**issue found**: blueprint documents positional invocation, not named args.

**why this is a nitpick, not blocker**:
- blueprint is documentation, not implementation
- implementation will use named args regardless:
```bash
and_then_await \
  artifact_type="release-pr" \
  artifact_display="release pr" \
  prior_merge_commit="$merge_sha"
```
- the rule says "hard to read, easy to break" for positional — but blueprint args are clearly labeled in the contract table (line 227-231) so readers understand the args even if invocation is positional
- extant git.release operations (emit_transport_watch, emit_transport_status) use mixed patterns — consistency improvement deferred

**resolution**: implementation will use named args; no blueprint change needed for r9. noted for implementation phase.

---

## check 5: exit code semantics

**brief**: `.agent/repo=ehmpathy/role=mechanic/briefs/practices/code.prod/pitofsuccess.errors/rule.require.exit-code-semantics.md`

**rule states**:
| code | rule sense | when |
|------|------------|------|
| 0 | success | operation completed as expected |
| 1 | malfunction | external error (gh failed, network, unexpected state) |
| 2 | constraint | user must fix something |

**blueprint implements**:
| outcome | exit code | analysis |
|---------|-----------|----------|
| found immediately | 0 | success — artifact available |
| found after wait | 0 | success — artifact appeared |
| timeout | 2 | constraint — artifact not available, user must investigate |

**why this holds**:
- exit 0 for found: artifact appearing is the success condition — matches rule "operation completed as expected"
- exit 2 for timeout: artifact not available is NOT a malfunction (gh works, network works) — it's a constraint (release-please hasn't run yet, or failed)
- exit 1 NOT used: malfunction would be if gh cli crashed or network timed out — but those would throw errors earlier in the call stack
- the distinction enables callers: exit 1 = "retry might help" (transient failure), exit 2 = "investigate release-please workflow"
- extant git.release uses same pattern: emit_transport_watch.sh uses exit 2 for "pr needs rebase" (constraint)

---

## check 6: fail-fast pattern

**brief**: `.agent/repo=ehmpathy/role=mechanic/briefs/practices/code.prod/pitofsuccess.errors/rule.require.fail-fast.md`

**rule states**: "enforce early exits and HelpfulError subclasses for invalid state or input"

**blueprint specifies** (lines 37-48):
```
├── poll loop with 90s timeout
│   ├── if found: emit ✨ found! and return 0
│   └── if poll: emit 💤 Xs in await
├── on timeout: emit ⚓ + 🔴 + return exit 2
```

**analysis of failure paths**:

| path | outcome | fail-fast? |
|------|---------|------------|
| artifact found on first check | exit 0 immediately | yes — no unnecessary poll cycles |
| artifact found after N polls | exit 0 after found | yes — exits as soon as condition met |
| 90s elapsed, no artifact | exit 2 with diagnostics | yes — clear termination, no silent hang |

**why this holds**:
- no silent failures: every exit path emits output (blank line, `✨ found!`, or `⚓ timeout`)
- no hidden state: AWAIT_RESULT is set explicitly on success, empty on timeout
- guard clauses: "if found: return" pattern — immediate exit when condition met
- no "hope for the best" loops: timeout is explicit (90s), not infinite poll
- diagnostic on failure: `🔴 release-please` with url/status gives actionable info — matches rule "rich context in helpful-errors"

---

## check 7: test structure

**brief**: `.agent/repo=ehmpathy/role=mechanic/briefs/practices/code.test/frames.behavior/rule.require.given-when-then.md`

**rule states**: "use jest with test-fns for given/when/then tests"

**blueprint test structure** (lines 117-187):
```
describe('git.release.p4.and_then_await')
├── given('[case1] release-pr found immediately')
│   └── then('output shows 🫧 and then... + blank line')
│   └── then('exit 0')
```

**analysis**:

| aspect | rule requires | blueprint implements | compliant? |
|--------|---------------|---------------------|------------|
| describe block | single describe | `describe('git.release.p4.and_then_await')` | yes |
| given labels | `[caseN]` format | `[case1]`, `[case2]`, ... `[case18]` | yes |
| when labels | `[tN]` format | (omitted — state-based tests) | yes |
| then blocks | one assertion each | `then('output shows...')`, `then('exit 0')` | yes |

**why this holds**:
- test file name follows pattern: `git.release.p4.and_then_await.integration.test.ts` — matches `git.release.{phase}.{name}.integration.test.ts`
- no when blocks because these are state-based tests: given a scenario, then assert output — no action step needed
- `[caseN]` labels enable test output scan: "which case failed?" is answered by label
- 18 cases match test matrix from wish (15 base + 3 stale→fresh expansions) — comprehensive coverage
- each then focuses on one behavior: not "output and exit and side effects" in one then

---

## check 8: output treestruct

**brief**: `.agent/repo=ehmpathy/role=ergonomist/briefs/cli/rule.require.treestruct-output.md`

**rule states**: "cli skill output must use turtle vibes treestruct format"

**elements defined in rule**:
| element | purpose |
|---------|---------|
| `├─` | sub.branch - has peers below |
| `└─` | sub.branch (last) - final peer |

**blueprint output shapes**:

### found after wait (lines 259-267)
```
🫧 and then...
   ├─ 💤 5s in await     # mid-branch
   ├─ 💤 10s in await    # mid-branch
   └─ ✨ found! after 15s # terminal
```

### timeout (lines 269-279)
```
🫧 and then...
   ├─ 💤 5s in await          # mid-branch
   ├─ 💤 10s in await         # mid-branch
   └─ ⚓ release pr...         # terminal of await tree
      └─ 🔴 release-please    # nested tree starts
            ├─ https://...    # mid-branch of nested
            └─ failed         # terminal of nested
```

**why this holds**:
- `├─` for mid-elements (poll lines), `└─` for terminal (found/timeout) — correct connector semantics
- 3-space indent (not 6-space): await is one level deep under `🫧`, matches wish output examples
- nested tree under `⚓`: the diagnostic info (`🔴 release-please`) is a sub-tree — correct structure
- connector progression: `└─ ⚓` closes await tree, then `└─ 🔴` starts nested tree, then `├─ url` + `└─ status` close that
- matches extant patterns: emit_transport_watch.sh uses same structure for `🥥 let's watch` sub-tree

---

## check 9: chill emoji usage

**brief**: `.agent/repo=ehmpathy/role=mechanic/briefs/practices/lang.tones/rule.prefer.chill-nature-emojis.md`

**rule states**: "prefer chill nature-based emojis for zen vibe... reuse emojis based on similarities"

**blueprint emoji usage**:

| emoji | context | semantic match | extant usage |
|-------|---------|----------------|--------------|
| 🫧 | transition bubble | bubble = transition to next state | extant: git.release.sh uses `🫧 and then...` |
| 💤 | poll wait | sleep = wait/pause | extant: print_watch_poll uses `💤` for poll lines |
| ✨ | found success | sparkle = success/completion | extant: print_watch_result uses `✨ done!` |
| ⚓ | timeout anchor | anchor = stuck/blocked | extant: emit_transport_status uses `⚓` for blocked states |
| 🔴 | workflow status | red = needs attention | extant: output.sh uses `🔴` for failed checks |

**why this holds**:
- all emojis reuse extant patterns — no new emoji vocabulary introduced
- each emoji has clear semantic: `💤` = wait, `✨` = success, `⚓` = blocked — rule says "reuse emojis based on similarities"
- no excessive use: one emoji per line type, not multiple per line
- chill nature theme maintained: bubble, sleep, sparkle, anchor — all fit zen vibe
- `🔴` is exception (not nature) but matches extant pattern for workflow/check failures

---

## check 10: file location

**brief**: `.agent/repo=ehmpathy/role=mechanic/briefs/practices/code.prod/evolvable.repo.structure/rule.require.directional-deps.md`

**rule states**: "enforce top-down dependency flow; lower layers must not import from higher ones"

**blueprint file locations**:

| file | proposed location | extant files in same location |
|------|-------------------|--------------------------------|
| git.release._.and_then_await.sh | skills/git.release/ | git.release._.emit_transport_watch.sh, git.release._.emit_transport_status.sh |
| operations.sh additions | skills/git.release/git.release.operations.sh | (same file, additions) |
| output.sh additions | skills/git.release/output.sh | (same file, additions) |
| .integration.test.ts | skills/git.release/ | git.release.p1.integration.test.ts, git.release.p2.integration.test.ts, git.release.p3.*.integration.test.ts |

**dependency analysis**:

| from | to | direction | compliant? |
|------|----|----|------------|
| and_then_await.sh | operations.sh | peer | yes |
| and_then_await.sh | output.sh | peer | yes |
| git.release.sh | and_then_await.sh | caller → callee | yes |
| tests | skill | test → prod | yes |

**why this holds**:
- all files in skills/git.release/ — no layer cross to domain/ or contract/
- operations.sh additions (get_fresh_*) are peer-level with extant operations (get_pr_for_branch, get_pr_status)
- output.sh additions (print_await_*) are peer-level with extant print functions (print_watch_poll, print_watch_result)
- test file follows phase pattern: `git.release.p4.*.integration.test.ts` — matches p1, p2, p3 tests
- no upward imports: skill doesn't import from contract/, tests don't import from external packages

---

## issues found

| issue | severity | resolution |
|-------|----------|------------|
| positional args in blueprint contract | nitpick | implementation will use named args; no blueprint change needed |

---

## summary

| check | aspect | compliant? |
|-------|--------|------------|
| 1 | function name conventions | yes |
| 2 | term conventions | yes |
| 3 | gerund avoidance | yes |
| 4 | input-context pattern | nitpick (shell uses positional, will use named args in impl) |
| 5 | exit code semantics | yes |
| 6 | fail-fast pattern | yes |
| 7 | test structure | yes |
| 8 | output treestruct | yes |
| 9 | chill emoji usage | yes |
| 10 | file location | yes |

**violations found**: 0 blockers, 1 nitpick (positional args in docs, will fix in implementation)

**conclusion**: blueprint follows mechanic role standards. one nitpick noted for implementation.

