# review: has-pruned-yagni (r3)

reviewed each component in the blueprint against wish, vision, and criteria. read wish line by line, matched each component to specific quotes.

---

## components traced to requirements

### and_then_await operation

**wish line 102-104**: "the `await_release_pr_after_merge` function and the inline tag await logic must be consolidated into a single reusable operation"
**wish line 106**: "**file**: `src/domain.roles/mechanic/skills/git.release/git.release._.and_then_await.sh`"
**minimum viable?**: yes — exactly what wish prescribes, no extras
**could be simpler?**: no — wish explicitly asks for this file and this structure
**verdict**: keep

---

### get_fresh_release_pr()

**wish line 5**: "artifact MUST come AFTER the squash merge"
**wish line 94**: "check: `git merge-base --is-ancestor M1 <next-transport-commit>`"
**wish line 91**: "feature PR squash-merges to main (merge commit M1) → await release PR whose head commit is ahead of M1"
**minimum viable?**: yes — one function that combines PR lookup + freshness check
**could be simpler?**: no — must do both lookup and freshness. two operations would add complexity.
**verdict**: keep

---

### get_fresh_release_tag()

**wish line 92**: "release PR squash-merges to main (merge commit M2) → await tag whose commit is ahead of M2"
**wish line 94**: "check: `git merge-base --is-ancestor M1 <next-transport-commit>`"
**minimum viable?**: yes — one function that combines tag lookup + freshness check
**could be simpler?**: no — must do both lookup and freshness. two operations would add complexity.
**verdict**: keep

---

### get_release_please_status()

**wish line 65**: "note: lookup release-please workflow status on timeout (same pattern as checks failed output)"
**wish lines 49-51, 60-62**: show `🔴 release-please` with url and status
**minimum viable?**: yes — single gh call for workflow status
**could be simpler?**: no — need url, status, conclusion for output. all three shown in wish.
**verdict**: keep

---

### print_await_poll()

**wish lines 46-47, 69-70**: output examples show:
```
   ├─ 💤 5s in await
   ├─ 💤 10s in await
```
**minimum viable?**: yes — single function for poll line with is_last parameter
**could be simpler?**: could inline echo. but function matches extant output.sh pattern.
**verdict**: keep

---

### print_await_result()

**wish line 71**: `└─ ✨ found! after 10s in wait`
**wish line 48**: `└─ ⚓ release pr did not appear in 90s`
**minimum viable?**: yes — single function with status parameter
**could be simpler?**: could inline echo. but function matches extant pattern and reduces duplication.
**verdict**: keep

---

### print_workflow_status()

**wish lines 49-51**:
```
      └─ 🔴 release-please
            ├─ https://github.com/owner/repo/actions/runs/12345
            └─ failed
```
**minimum viable?**: yes — nested tree with name, url, status
**could be simpler?**: no — nested structure is prescribed by wish output
**verdict**: keep

---

### 18 test cases

**wish line 181**: "**total: 15 cases** (2 regression + 5 positive + 8 timeout)"
**question**: blueprint says 18 cases. where do 3 extra come from?
**answer**: the wish test matrix (lines 142-180) lists 15 numbered cases. blueprint adds stale→fresh transition cases (case5, case6, case8, case9) which expand the stale scenarios.
**minimum viable?**: 15 cases per wish. 18 cases cover stale→fresh transitions explicitly.
**could be fewer?**: no — wish prescribes 15 minimum. stale→fresh is critical regression.
**verdict**: keep — wish prescribes 15, extra 3 are stale→fresh edge cases worth coverage

---

## yagni candidates reviewed

### AWAIT_RESULT variable

**question**: was this explicitly requested in wish?
**wish line 119**: "returns: exit 0 + sets AWAIT_RESULT: artifact found"
**answer**: YES — explicitly requested in wish. not YAGNI.
**verdict**: keep — wish prescribes it

---

### poll interval acceleration in test mode

**question**: was this explicitly requested?
**answer**: not in wish, but reuse of extant pattern from emit_transport_watch.sh (lines 112-120)
**wish line 186**: "verification" section shows tests will run
**necessity**: tests must complete quickly. without acceleration, 90s timeout = 90s test duration.
**verdict**: keep — required for practical test execution, reuse extant pattern

---

## what we did NOT add (YAGNI applied)

### configurability for 90s timeout

**temptation**: add `--timeout` parameter for flexibility
**vision quote (from r1)**: "90s configurable? — [answered] 90s per wish examples; configurability deferred (YAGNI)"
**wish lines 43-52**: output examples show 90s explicitly
**verdict**: correct to omit — would be YAGNI

---

### separate files for print functions

**temptation**: create `output.await.sh` for await-specific functions
**extant pattern**: output.sh collects all print functions for git.release
**verdict**: correct to omit — follows extant structure, no new abstraction

---

### abstraction layer for artifact types

**temptation**: create ArtifactChecker interface with release-pr and tag implementations
**blueprint**: simple switch on artifact_type in and_then_await
**verdict**: correct to omit — simple switch is sufficient, interface would be premature

---

### cache for freshness checks

**temptation**: cache git merge-base results to reduce commands
**necessity**: each poll needs fresh check. cache would break freshness guarantee.
**verdict**: correct to omit — would break core behavior

---

## summary

reviewed 9 components:
- 8 trace directly to wish line numbers
- 1 (AWAIT_RESULT) traces to wish line 119 — explicitly requested

reviewed 4 YAGNI candidates that were correctly omitted:
- timeout configurability
- separate print files
- artifact abstraction layer
- freshness cache

**conclusion**: no YAGNI detected. all components trace to requirements. no extras to prune.
