# review: has-behavior-declaration-coverage (r7)

traced each requirement from vision and criteria to blueprint. checked for gaps.

---

## vision requirements

### requirement V1: commit-based freshness (MANDATORY)

**vision**: "artifacts MUST come AFTER the squash merge just performed"

**blueprint coverage**:
- blueprint line 11: "enforces the MANDATORY requirement: artifacts MUST come AFTER the squash merge"
- blueprint line 57-59: get_fresh_release_pr() uses `git merge-base --is-ancestor`
- blueprint line 66-68: get_fresh_release_tag() uses `git merge-base --is-ancestor`
- blueprint lines 237-244: freshness check contract documented

**verdict**: ✓ COVERED

---

### requirement V2: await with poll UI

**vision**: "💤 5s in await" poll lines in wait

**blueprint coverage**:
- blueprint line 42: poll loop with 90s timeout
- blueprint line 43: print_await_poll() for poll lines
- blueprint lines 81-83: print_await_poll() implementation spec

**verdict**: ✓ COVERED

---

### requirement V3: found after wait message

**vision**: "✨ found! after Xs"

**blueprint coverage**:
- blueprint line 41: "if found: emit ✨ found! and return 0"
- blueprint lines 85-87: print_await_result() spec includes found case
- blueprint lines 259-267: found after wait output shape

**verdict**: ✓ COVERED

---

### requirement V4: timeout diagnostics

**vision**: "⚓ artifact did not appear in 90s" + "🔴 release-please" with url/status

**blueprint coverage**:
- blueprint lines 44-48: on timeout, emit diagnostics with workflow lookup
- blueprint lines 71-76: get_release_please_status() spec
- blueprint lines 89-91: print_workflow_status() spec
- blueprint lines 269-279: timeout with diagnostics output shape

**verdict**: ✓ COVERED

---

### requirement V5: found immediately (no sub-branches)

**vision**: "🫧 and then..." + blank + next transport (no poll lines)

**blueprint coverage**:
- blueprint line 36: emit 🫧 and then...
- blueprint lines 249-257: found immediately output shape shows blank line

**verdict**: ✓ COVERED

---

### requirement V6: exit codes

**vision**: exit 0 (found), exit 2 (timeout/constraint)

**blueprint coverage**:
- blueprint line 34: "output: exit 0 (found) or exit 2 (timeout)"
- blueprint lines 230-235: contracts table shows exit codes

**verdict**: ✓ COVERED

---

### requirement V7: single reusable operation

**vision**: "single `and_then_await` function for both transports"

**blueprint coverage**:
- blueprint line 19: new file git.release._.and_then_await.sh
- blueprint lines 32-50: and_then_await() handles both artifact types

**verdict**: ✓ COVERED

---

## criteria requirements (given/when/then traces)

### criterion C1: usecase.1 = artifact found immediately

| given/when/then | blueprint line | coverage |
|-----------------|----------------|----------|
| given(artifact is fresh and available on first check) | line 40: get_fresh_release_pr/tag returns artifact | ✓ |
| when(and_then_await is invoked) | line 32: and_then_await() entry | ✓ |
| then(output shows 🫧 and then... + blank) | line 36: emit 🫧, line 251-257: output shape | ✓ |
| then(next transport output follows immediately) | line 257: blank line then next | ✓ |
| then(exit 0) | line 34: "exit 0 (found)" | ✓ |

**verdict**: ✓ ALL TRACED

---

### criterion C2: usecase.2 = artifact found after wait

| given/when/then | blueprint line | coverage |
|-----------------|----------------|----------|
| given(artifact not available on first check) | line 37: poll loop entered | ✓ |
| when(and_then_await polls and artifact appears) | line 40: get_fresh_* returns artifact | ✓ |
| then(output shows 🫧 with poll sub-branches) | lines 263-266: poll lines shape | ✓ |
| then(poll lines show cumulative elapsed time) | line 82: print_await_poll(elapsed_seconds) | ✓ |
| then(final line shows ✨ found! after Xs) | line 86: print_await_result found case | ✓ |
| then(exit 0) | line 34: "exit 0 (found)" | ✓ |

**verdict**: ✓ ALL TRACED

---

### criterion C3: usecase.3 = timeout with diagnostics

| given/when/then | blueprint line | coverage |
|-----------------|----------------|----------|
| given(artifact does not appear within 90s) | line 37: 90s timeout | ✓ |
| when(and_then_await times out) | lines 44-48: on timeout block | ✓ |
| then(⚓ {artifact} did not appear in 90s) | line 87: print_await_result timeout | ✓ |
| then(🔴 release-please with url + status) | lines 46-47, 89-91: workflow status | ✓ |
| then(exit 2) | line 48: "return exit 2" | ✓ |
| given(workflow failed) then(status=failed) | test case 11, 15 | ✓ |
| given(workflow in_progress) then(status=in_progress) | test case 12, 16 | ✓ |
| given(workflow passed) then(status=passed) | test case 13, 17 | ✓ |
| given(workflow not_found) then(status=not_found) | test case 14, 18 | ✓ |

**verdict**: ✓ ALL TRACED

---

### criterion C4: usecase.4 = stale artifact rejection (critical regression)

| given/when/then | blueprint line | coverage |
|-----------------|----------------|----------|
| given(old artifact exists from prior merge) | test case 5, 8: stale artifact setup | ✓ |
| when(new merge occurs, and_then_await invoked) | line 33: prior_merge_commit input | ✓ |
| then(stale rejected via commit ancestry) | lines 57-59, 66-68: merge-base check | ✓ |
| then(poll continues until fresh or timeout) | line 37: poll loop continues | ✓ |
| given(old PR exists, M1 not ancestor) then(reject) | test case 5: stale PR rejected | ✓ |
| given(PR updated after M1) then(accept) | test case 6: fresh PR accepted | ✓ |

**verdict**: ✓ ALL TRACED

---

### criterion C5: usecase.5 = transport-specific behavior

| given/when/then | blueprint line | coverage |
|-----------------|----------------|----------|
| given(await release PR) when(timeout) then("release pr did not appear") | line 33: artifact_display, test 11-14 | ✓ |
| given(await tag) when(timeout) then("tag v{version} did not appear") | line 33: artifact_display, test 15-18 | ✓ |

**verdict**: ✓ ALL TRACED

---

## summary

### vision requirements (7 total)

| requirement | traced to blueprint line(s) |
|-------------|---------------------------|
| V1: commit-based freshness (MANDATORY) | lines 11, 57-59, 66-68, 237-244 |
| V2: await poll UI | lines 42, 43, 81-83 |
| V3: found after wait | lines 41, 85-87, 259-267 |
| V4: timeout diagnostics | lines 44-48, 71-76, 89-91, 269-279 |
| V5: found immediately | lines 36, 249-257 |
| V6: exit codes | lines 34, 230-235 |
| V7: single operation | lines 19, 32-50 |

### criteria requirements (5 usecases, 22 given/when/then statements)

| usecase | given/when/then count | all traced? |
|---------|----------------------|-------------|
| C1: found immediately | 5 statements | ✓ all traced |
| C2: found after wait | 6 statements | ✓ all traced |
| C3: timeout with diagnostics | 9 statements | ✓ all traced |
| C4: stale rejection | 6 statements | ✓ all traced |
| C5: transport-specific | 2 statements | ✓ all traced |

### test matrix coverage

| test case range | count | covered in blueprint? |
|-----------------|-------|----------------------|
| cases 1-4: found scenarios | 4 | ✓ lines 117-131 |
| cases 5-10: stale scenarios | 6 | ✓ lines 133-155 |
| cases 11-18: timeout scenarios | 8 | ✓ lines 157-187 |

**total: 18 test cases documented in blueprint**

**conclusion**: all 7 vision requirements and all 22 criteria statements are traced to specific blueprint lines. all 18 test cases from wish matrix are documented. no gaps found.

