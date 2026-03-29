# review: has-behavior-declaration-adherance (r8)

checked blueprint against vision and criteria line by line. verified correct interpretation, no deviations.

---

## methodology

for each blueprint element, I checked:
1. does it match what vision describes?
2. does it satisfy criteria correctly?
3. any misinterpretation or deviation from spec?

---

## check 1: commit-based freshness mechanism

**vision states** (MANDATORY section):
> "the artifact we await MUST come AFTER the squash merge we just performed"
> `git merge-base --is-ancestor M1 <release-pr-head>`

**blueprint implements** (lines 57-59, 66-68):
```
get_fresh_release_pr()
├── git merge-base --is-ancestor $prior_merge_commit $headRefOid
└── return: PR json if ancestor check passes

get_fresh_release_tag()
├── git merge-base --is-ancestor $prior_merge_commit $tag_commit
└── return: tag commit sha if ancestor check passes
```

**adherance check**:

| aspect | vision spec | blueprint implementation | matches? |
|--------|-------------|-------------------------|----------|
| command | `git merge-base --is-ancestor` | `git merge-base --is-ancestor` | yes |
| M1 arg | prior merge commit | `$prior_merge_commit` | yes |
| artifact arg | `<release-pr-head>` or `<tag-commit>` | `$headRefOid` / `$tag_commit` | yes |
| exit semantics | exit 0 = fresh | "ancestor check passes" | yes |

**why this holds**:
- vision specifies `git merge-base --is-ancestor M1 <artifact-commit>` — blueprint uses exact same command
- vision uses symbolic M1 — blueprint uses `$prior_merge_commit` which is the concrete sha
- vision specifies exit 0 = fresh — blueprint returns artifact json only when ancestor check passes (exit 0)
- the `--is-ancestor` flag is correctly placed: first arg (M1) must be ancestor of second arg (artifact commit)
- no deviation in argument order or semantics

**verdict**: correct adherance. no deviation.

---

## check 2: output shape - found immediately

**vision states** (output examples):
```
🫧 and then...

🌊 release: chore(release): v1.3.0
```
> "when the artifact is found on first check, no `├─ 💤` await lines appear — just a blank line transition to the next transport"

**criteria C1 states**:
```
then(output shows `🫧 and then...` followed by blank line)
then(next transport output follows immediately)
```

**blueprint implements** (lines 249-257):
```
### found immediately

🫧 and then...

(blank line, then next transport output follows)
```

**adherance check**:

| aspect | vision/criteria spec | blueprint implementation | matches? |
|--------|----------------------|-------------------------|----------|
| bubble line | `🫧 and then...` | `🫧 and then...` | yes |
| after bubble | blank line | blank line | yes |
| next transport | follows immediately | "next transport output follows" | yes |
| no poll lines | no `├─ 💤` | blank, no sub-branches | yes |

**why this holds**:
- vision shows `🫧 and then...` followed by blank line, then `🌊 release:` — blueprint replicates this exact output shape
- criteria C1 explicitly states "followed by blank line" — blueprint shows blank line in output shape
- the blank line is structural: it separates the transition bubble from the next transport's output
- "no sub-branches" is correct interpretation: when found on first check, no `├─ 💤` lines should appear
- vision says "no `├─ 💤` await lines appear" for immediate find — blueprint omits them

**verdict**: correct adherance. no deviation.

---

## check 3: output shape - found after wait

**vision states**:
```
🫧 and then...
   ├─ 💤 5s in await
   ├─ 💤 10s in await
   └─ ✨ found! after 15s

🌊 release: chore(release): v1.3.0
```

**criteria C2 states**:
```
then(poll lines show cumulative elapsed time: `├─ 💤 5s in await`, `├─ 💤 10s in await`)
then(final line shows `└─ ✨ found! after Xs`)
```

**blueprint implements** (lines 259-267):
```
### found after wait

🫧 and then...
   ├─ 💤 5s in await
   ├─ 💤 10s in await
   └─ ✨ found! after 15s

```

**adherance check**:

| aspect | vision/criteria spec | blueprint implementation | matches? |
|--------|----------------------|-------------------------|----------|
| poll format | `├─ 💤 5s in await` | `├─ 💤 5s in await` | yes |
| cumulative time | 5s, 10s, 15s | 5s, 10s, 15s | yes |
| found format | `└─ ✨ found! after Xs` | `└─ ✨ found! after 15s` | yes |
| indent level | 3-space | 3-space (under `🫧`) | yes |

**why this holds**:
- vision output shows `   ├─ 💤 5s in await` with 3-space indent — blueprint matches exactly
- criteria C2 specifies "poll lines show cumulative elapsed time" — blueprint shows 5s, 10s, 15s (cumulative, not interval)
- cumulative time is correct interpretation: each line shows total elapsed, not time since last poll
- the `└─` connector for the found line is correct: it terminates the sub-branch under `🫧`
- indent level (3-space) is distinct from watch (6-space) — await is one level deep under `🫧`, watch is two levels deep under `🌊` + `🥥`

**verdict**: correct adherance. no deviation.

---

## check 4: output shape - timeout with diagnostics

**vision states**:
```
🫧 and then...
   ├─ 💤 5s in await
   ├─ 💤 10s in await
   └─ ⚓ release pr did not appear in 90s
      └─ 🔴 release-please
            ├─ https://github.com/owner/repo/actions/runs/12345
            └─ failed
```

**criteria C3 states**:
```
then(output shows `└─ ⚓ {artifact} did not appear in 90s`)
then(output shows workflow status: `└─ 🔴 release-please` with url and status)
```

**blueprint implements** (lines 269-279):
```
### timeout with diagnostics

🫧 and then...
   ├─ 💤 5s in await
   ├─ 💤 10s in await
   └─ ⚓ release pr did not appear in 90s
      └─ 🔴 release-please
            ├─ https://github.com/owner/repo/actions/runs/12345
            └─ failed
```

**adherance check**:

| aspect | vision/criteria spec | blueprint implementation | matches? |
|--------|----------------------|-------------------------|----------|
| timeout anchor | `└─ ⚓ release pr did not appear in 90s` | exact match | yes |
| workflow indicator | `└─ 🔴 release-please` | exact match | yes |
| url format | nested `├─ url` | nested `├─ https://...` | yes |
| status format | nested `└─ failed` | nested `└─ failed` | yes |
| nest structure | indent under `⚓` | indent under `⚓` | yes |

**why this holds**:
- vision shows exact tree structure with `⚓` anchor, then nested `🔴 release-please` — blueprint replicates exactly
- the nested structure shows: url on `├─` (not last), status on `└─` (last) — correct treestruct
- vision uses 90s timeout — blueprint uses 90s (not configurable, per vision "configurability deferred")
- criteria C3 requires `🔴 release-please` with url AND status — both present in blueprint output
- the diagnostic tree provides actionable info: workflow name + url + status lets user investigate immediately

**verdict**: correct adherance. no deviation.

---

## check 5: exit code semantics

**vision states** (contracts section):
| outcome | exit code |
|---------|-----------|
| found | 0 |
| timeout | 2 (constraint error) |

**criteria C3 states**:
```
then(exit 2)
  sothat(caller knows this is a constraint error)
```

**blueprint implements** (lines 230-235):
| outcome | exit code | stdout | AWAIT_RESULT |
|---------|-----------|--------|--------------|
| found immediately | 0 | `🫧 and then...` + blank | artifact json |
| found after wait | 0 | `🫧` + `💤` lines + `✨ found!` | artifact json |
| timeout | 2 | `🫧` + `💤` lines + `⚓` + `🔴` | empty |

**adherance check**:

| aspect | vision/criteria spec | blueprint implementation | matches? |
|--------|----------------------|-------------------------|----------|
| found exit | 0 | 0 | yes |
| timeout exit | 2 | 2 | yes |
| timeout means | constraint error | constraint error | yes |

**why this holds**:
- vision contracts specify exit 0 for found, exit 2 for timeout — blueprint matches exactly
- exit 2 is the correct code for constraint errors per `rule.require.exit-code-semantics`: user must fix something (artifact not ready)
- exit 2 (not exit 1) is intentional: timeout is a constraint (artifact not available), not a malfunction (gh failed)
- criteria C3 explicitly states `sothat(caller knows this is a constraint error)` — exit 2 fulfills this
- the distinction matters for callers: exit 1 = retry might help, exit 2 = user action needed

**verdict**: correct adherance. no deviation.

---

## check 6: workflow status lookup

**criteria C3 states**:
```
given(release-please workflow failed)
  when(timeout occurs)
    then(workflow status shows `failed`)

given(release-please workflow is still active)
  when(timeout occurs)
    then(workflow status shows `in_progress`)

given(release-please workflow passed but artifact absent)
  when(timeout occurs)
    then(workflow status shows `passed`)

given(release-please workflow not found)
  when(timeout occurs)
    then(workflow status shows `not found`)
```

**blueprint implements** (test cases 11-18):
| case | transport | workflow | expected |
|------|-----------|----------|----------|
| 11 | release-pr | failed | `🔴 release-please + failed` |
| 12 | release-pr | in_progress | `🔴 release-please + in_progress` |
| 13 | release-pr | passed | `🔴 release-please + passed` |
| 14 | release-pr | not_found | `🔴 release-please + not found` |
| 15-18 | tag | (same 4 states) | (same outputs) |

**adherance check**:

| criteria state | test case | covered? |
|----------------|-----------|----------|
| failed | 11, 15 | yes |
| in_progress | 12, 16 | yes |
| passed | 13, 17 | yes |
| not_found | 14, 18 | yes |

**why this holds**:
- criteria C3 specifies 4 distinct workflow states (failed, in_progress, passed, not_found) — all 4 covered in test matrix
- each state appears twice: once for release-pr transport, once for tag transport — exhaustive coverage
- `in_progress` is the correct term (not "active" or "pending") — matches gh cli output
- `not_found` handles edge case where release-please workflow doesn't exist in repo
- `passed` is important: shows workflow ran successfully but still no artifact (maybe release-please has bug)
- the diagnostic value: user sees exact workflow state, not just "timeout"

**verdict**: correct adherance. all workflow states covered.

---

## check 7: stale artifact rejection

**criteria C4 states**:
```
given(old artifact exists from a prior merge)
  when(new merge occurs and and_then_await is invoked)
    then(stale artifact is rejected via commit ancestry check)
    then(poll continues until fresh artifact appears or timeout)

given(old release PR exists, new merge commit M1)
  when(and_then_await checks the old PR)
    then(old PR is rejected because M1 is not ancestor of old PR head)
    then(poll continues)

given(old release PR is updated with new commit after M1)
  when(and_then_await checks the updated PR)
    then(updated PR is accepted because M1 is ancestor of new PR head)
```

**blueprint implements** (test cases 5-10):
| case | scenario | expected |
|------|----------|----------|
| 5 | stale release-pr rejected | stale PR not accepted, poll continues |
| 6 | stale release-pr then fresh appears | fresh PR accepted, `✨ found!` |
| 7 | stale release-pr then timeout | `⚓ timeout`, exit 2 |
| 8-10 | (same for tag) | (same patterns) |

**adherance check**:

| criteria statement | test case | matches? |
|--------------------|-----------|----------|
| stale rejected | 5, 8 | yes |
| poll continues | 5, 8 | yes |
| fresh accepted | 6, 9 | yes |
| timeout if no fresh | 7, 10 | yes |
| M1 not ancestor = reject | freshness check spec | yes |
| M1 is ancestor = accept | freshness check spec | yes |

**why this holds**:
- criteria C4 is THE critical regression test — stale artifact rejection is the core defect we must fix
- blueprint test cases 5-10 explicitly cover: stale rejected → poll continues → (fresh found OR timeout)
- the stale→fresh transition (cases 6, 9) verifies PR/tag can be updated after merge and still be accepted
- this handles the wish scenario: "release PR opened before feat merge, updated after" — commit ancestry catches the update
- `git merge-base --is-ancestor M1 <artifact>` returns exit 1 for stale (M1 not ancestor of artifact)
- poll continues on stale: correct behavior, not early exit with wrong artifact
- the fix inverts the defect: instead of "instantly pick up OLD artifact", we "reject stale, poll until fresh"

**verdict**: correct adherance. stale rejection correctly implemented.

---

## check 8: transport-specific display

**criteria C5 states**:
```
given(await release PR after feature merge)
  when(timeout occurs)
    then(message shows "release pr did not appear in 90s")

given(await tag after release PR merge)
  when(timeout occurs)
    then(message shows "tag v{version} did not appear in 90s")
```

**vision states**:
> "the tag case includes the version, the release PR case doesn't. this is intentional — we know the expected tag version, but we don't know the expected release PR number"

**blueprint implements** (lines 32-34):
```
and_then_await artifact_type artifact_display prior_merge_commit

artifact_display: display name for timeout message
```

**adherance check**:

| transport | criteria spec | blueprint implementation | matches? |
|-----------|---------------|-------------------------|----------|
| release-pr | "release pr did not appear in 90s" | artifact_display = "release pr" | yes |
| tag | "tag v{version} did not appear in 90s" | artifact_display = "tag v$version" | yes |

**why this holds**:
- criteria C5 specifies different messages: "release pr" vs "tag v{version}" — artifact_display enables this
- vision explains the asymmetry: "we know the expected tag version, but we don't know the expected release PR number"
- artifact_display is caller-provided: call site knows the context (version number for tag, generic for pr)
- this avoids hardcoded strings in and_then_await — operation stays generic, caller provides specifics
- the pattern is correct: operation handles behavior, caller handles display context

**verdict**: correct adherance. artifact_display parameter enables transport-specific messages.

---

## check 9: single reusable operation

**vision states**:
> "both await scenarios (release-pr and tag) share: poll loop with timeout, freshness check via commit ancestry, poll UI with elapsed time, timeout diagnostics with workflow status"

**blueprint implements** (lines 19, 32-50):
```
[+] git.release._.and_then_await.sh              # new: reusable await operation

and_then_await()
├── input: artifact_type, artifact_display, prior_merge_commit
├── poll loop with 90s timeout
├── get_fresh_release_pr() or get_fresh_release_tag()
├── if found: emit ✨ found!
├── if poll: emit 💤 Xs in await
└── on timeout: emit ⚓ + 🔴
```

**adherance check**:

| aspect | vision spec | blueprint implementation | matches? |
|--------|-------------|-------------------------|----------|
| single file | one operation | git.release._.and_then_await.sh | yes |
| poll loop | shared | poll loop with 90s timeout | yes |
| freshness check | shared | get_fresh_* functions | yes |
| poll UI | shared | emit 💤 Xs in await | yes |
| timeout diagnostics | shared | emit ⚓ + 🔴 | yes |
| artifact_type switch | only difference | artifact_type parameter | yes |

**why this holds**:
- vision explicitly lists what both transports share: poll loop, freshness check, poll UI, timeout diagnostics
- blueprint consolidates all shared behavior into `and_then_await()` — no duplication
- artifact_type parameter (release-pr | tag) is the only variation point — matches vision analysis
- the extant inline tag await loop (vision: "lines 874-895") is marked for removal — consolidation achieved
- single file `git.release._.and_then_await.sh` follows name pattern (vision: "file patterns")
- get_fresh_release_pr() and get_fresh_release_tag() are separate because artifact lookup differs (gh pr list vs git fetch --tags)
- but the poll loop that CALLS them is shared — correct decomposition

**verdict**: correct adherance. single reusable operation handles both transports.

---

## potential deviations checked

### deviation check A: test count

**vision states**: test matrix section shows 15 cases
**blueprint implements**: 18 cases

**analysis**: blueprint adds cases 5-10 (stale→fresh transitions) which expand the stale scenarios. these are additional coverage for the critical regression, not a deviation from spec. vision explicitly requires stale rejection coverage.

**verdict**: not a deviation. additional coverage is additive, not contradictory.

### deviation check B: poll interval

**vision states** (deferred to implementation): "research — deferred to implementation: extant --watch patterns"

**blueprint implements**: `[←] poll interval logic from emit_transport_watch.sh`

**analysis**: blueprint correctly defers to extant pattern rather than invent new interval logic. this follows vision's instruction.

**verdict**: not a deviation. correct deferral to extant pattern.

### deviation check C: AWAIT_RESULT output

**vision states** (contracts): `AWAIT_RESULT: artifact json`

**blueprint implements** (line 50): `set AWAIT_RESULT for caller`

**analysis**: blueprint sets AWAIT_RESULT as specified. used by caller to access found artifact.

**verdict**: not a deviation. matches vision contract.

---

## summary

| check | aspect | adherance? |
|-------|--------|------------|
| 1 | commit-based freshness | correct |
| 2 | found immediately output | correct |
| 3 | found after wait output | correct |
| 4 | timeout with diagnostics output | correct |
| 5 | exit code semantics | correct |
| 6 | workflow status lookup | correct |
| 7 | stale artifact rejection | correct |
| 8 | transport-specific display | correct |
| 9 | single reusable operation | correct |

**deviations found**: none

**misinterpretations found**: none

**conclusion**: blueprint correctly adheres to vision and criteria. all output shapes match exactly. all behavior semantics match exactly. no deviation from spec.

