# review: has-consistent-mechanisms (r5)

reviewed blueprint for new mechanisms that duplicate extant functionality. searched git.release codebase for related codepaths.

---

## search conducted

searched `src/domain.roles/mechanic/skills/git.release/` for:
- `grep -r "print_"` → found 20+ print functions in output.sh
- `grep -r "poll"` → found 19 files with poll-related code
- read operations.sh → found _gh_with_retry, get_pr_for_branch, get_pr_status, etc.
- read output.sh → found print_watch_poll, print_watch_result, print_transition, etc.
- read mockSequence.ts → found SEQUENCES, genWatchSequence for test poll evolution
- read emit_transport_watch.sh → found poll interval logic lines 112-120

---

## methodology

for each new mechanism in the blueprint, I asked:
1. does the codebase already have a mechanism that does this?
2. do we duplicate extant utilities or patterns?
3. could we reuse an extant component instead of a new one?

---

## mechanism 1: print_await_poll()

**blueprint line 81-83**: `print_await_poll()` emits `├─ 💤 Xs in await`

**extant similar**: `print_watch_poll()` at output.sh:117-128

**comparison**:
| aspect | print_watch_poll | print_await_poll |
|--------|------------------|------------------|
| indent | 6-space (`      ├─`) | 3-space (`   ├─`) |
| message | `N left, Xs in action, Xs watched` | `Xs in await` |
| connector | `├─` or `└─` | `├─` or `└─` |

**could we reuse?**
- NO. different indent level (await is 1 level deep, watch is 2 levels deep)
- NO. different message format
- parameterizing indent would add complexity for no gain

**verdict**: new function justified. indent difference is structural, not arbitrary.

---

## mechanism 2: print_await_result()

**blueprint line 85-87**: `print_await_result()` emits `└─ ✨ found!` or `└─ ⚓ timeout`

**extant similar**: `print_watch_result()` at output.sh:134-157

**comparison**:
| aspect | print_watch_result | print_await_result |
|--------|-------------------|-------------------|
| indent | 6-space (`      └─`) | 3-space (`   └─`) |
| statuses | done, failed, timeout | found, timeout |
| done message | `✨ done!` | `✨ found! after Xs` |
| fail message | `⚓ failed` | `⚓ {artifact} did not appear in 90s` |

**could we reuse?**
- NO. different indent level
- NO. different status enum (found vs done)
- NO. different message format with artifact name

**verdict**: new function justified. semantics differ (await finds artifacts, watch observes CI).

---

## mechanism 3: print_workflow_status()

**blueprint line 89-91**: `print_workflow_status()` emits nested tree with workflow info

**extant similar**: `print_failed_check()` at output.sh:205-223

**comparison**:
| aspect | print_failed_check | print_workflow_status |
|--------|-------------------|----------------------|
| purpose | show failed CI check | show workflow status |
| indent | 6-space nested | custom nested under `⚓` |
| fields | name, url, message | name, url, status |

**could we reuse?**
- NO. different nesting context (under `⚓` timeout, not under `🔴` failed)
- NO. different indentation structure

**verdict**: new function justified. different tree position and purpose.

---

## mechanism 4: poll interval logic

**blueprint line 38-39**: `[←] poll interval logic from emit_transport_watch.sh`

**extant pattern**: emit_transport_watch.sh lines 112-120
```bash
if [[ "${GIT_RELEASE_TEST_MODE:-}" == "true" ]]; then
  poll_interval=0
elif [[ -n "${GIT_RELEASE_POLL_INTERVAL:-}" ]]; then
  poll_interval="$GIT_RELEASE_POLL_INTERVAL"
elif [[ $elapsed -lt 60 ]]; then
  poll_interval=5
else
  poll_interval=15
fi
```

**blueprint approach**: [←] reuse marker indicates copy this pattern

**verdict**: CONSISTENT. blueprint explicitly reuses extant pattern, not duplicate.

---

## mechanism 5: test mode acceleration

**blueprint line 39**: `[←] test mode acceleration from emit_transport_watch.sh`

**extant pattern**: emit_transport_watch.sh line 112-113
```bash
if [[ "${GIT_RELEASE_TEST_MODE:-}" == "true" ]]; then
  poll_interval=0
```

**blueprint approach**: [←] reuse marker indicates copy this pattern

**verdict**: CONSISTENT. blueprint explicitly reuses extant pattern.

---

## mechanism 6: _gh_with_retry()

**blueprint line 78**: `[○] _gh_with_retry()` retained

**verdict**: CONSISTENT. extant mechanism reused, not duplicated.

---

## mechanism 7: test poll sequence

**blueprint lines 199-211**: test infra for poll evolution via state counter

**extant pattern**: mockSequence.ts provides:
- `SEQUENCES.inflightToPassed` — predefined 3-poll then pass sequence
- `SEQUENCES.inflightToFailed` — predefined 3-poll then fail sequence
- `genWatchSequence({ pollCount, terminal })` — custom sequence generator

**blueprint test infra patterns (lines 193-211)**:
```typescript
// scene with freshness check mock
const scene: Scene = { ... };

// git mock for freshness check
// poll evolution via state counter
```

**should blueprint reuse mockSequence.ts?**
- mockSequence.ts is for **watch** sequences (inflight → passed → merged)
- await sequences have different states (stale → fresh → found)
- await needs freshness check via `git merge-base --is-ancestor`

**verdict**: new test pattern justified. await has different state machine than watch:
- watch: `inflight → passed → merged` (CI states)
- await: `stale → fresh → found` (artifact freshness states)

**note for implementation**: could extend mockSequence.ts with `genAwaitSequence` if pattern proves reusable. but for initial implementation, inline state counter is simpler.

---

## summary

| mechanism | extant similar? | can reuse? | verdict |
|-----------|----------------|------------|---------|
| print_await_poll | print_watch_poll | NO (indent, message differ) | new function justified |
| print_await_result | print_watch_result | NO (indent, semantics differ) | new function justified |
| print_workflow_status | print_failed_check | NO (tree position, purpose differ) | new function justified |
| poll interval | emit_transport_watch | YES | blueprint reuses via [←] |
| test mode | emit_transport_watch | YES | blueprint reuses via [←] |
| _gh_with_retry | operations.sh | YES | blueprint retains via [○] |
| test poll sequence | mockSequence.ts | NO (different state machine) | inline pattern justified |

**conclusion**: no unjustified duplication. new mechanisms are justified by structural differences (indent levels, message formats, state machines). extant patterns are explicitly reused via [←] and [○] markers.

**open question**: none. all decisions traced to concrete code evidence.

