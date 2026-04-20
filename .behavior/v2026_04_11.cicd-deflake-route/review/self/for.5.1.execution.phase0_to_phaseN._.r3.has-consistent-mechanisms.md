# self-review: has-consistent-mechanisms

## question

for each new mechanism in the code, ask:
- does the codebase already have a mechanism that does this?
- do we duplicate extant utilities or patterns?
- could we reuse an extant component instead of a new one?

## search for related codepaths

searched for gh api usage in mechanic skills:

```
src/domain.roles/mechanic/skills/show.gh.action.logs.sh
src/domain.roles/mechanic/skills/cicd.deflake/detect.sh
```

both use similar gh api calls:
- `repos/$REPO/actions/runs` - fetch workflow runs
- `repos/$REPO/actions/runs/$RUN_ID/jobs` - fetch jobs
- `repos/$REPO/actions/jobs/$JOB_ID/logs` - fetch logs

## review

### 1. output.sh

**extant:** `declapract.upgrade/output.sh`

**assessment:** each skill has its own output.sh because output needs differ:
- `declapract.upgrade`: `print_upgrade_summary`, `print_defect_item`
- `cicd.deflake`: `print_flake_item`, different tree structure

**verdict:** holds. different output needs justify separate files. follows pattern.

### 2. cicd.deflake.sh (dispatcher)

**extant:** `declapract.upgrade.sh`

**assessment:** follows same dispatcher pattern intentionally for consistency across mechanic skills.

**verdict:** holds. pattern reuse, not duplication.

### 3. init.sh

**extant:** `declapract.upgrade/init.sh`

**assessment:** follows same route-creation pattern:
- validate git repo
- generate route path
- copy templates
- bind route

**verdict:** holds. pattern reuse. route creation is the same mechanism, applied to different templates.

### 4. detect.sh vs show.gh.action.logs.sh

**extant:** `show.gh.action.logs.sh` uses similar gh api calls

**assessment:** similar API usage, different purpose:

| aspect | show.gh.action.logs | detect.sh |
|--------|---------------------|-----------|
| purpose | debug specific run | analyze history for flakes |
| scope | single run | 30 days of runs |
| filter | current branch | main branch only |
| output | log text | JSON inventory |
| intent | show logs | find patterns |

#### deep dive: exact api call comparison

**endpoint 1: get workflow runs**

detect.sh (line 150-154):
```bash
RUNS_JSON=$(gh api --method GET "repos/$REPO/actions/runs" \
  --field branch=main \
  --field per_page=100 \
  --field created=">=$SINCE_DATE" \
  -q '.workflow_runs' 2>/dev/null || echo "[]")
```

show.gh.action.logs.sh: does NOT call this endpoint directly. uses `gh run list` cli wrapper instead (line 145-152), which targets a specific workflow by name.

**verdict:** different query semantics. detect.sh needs ALL runs on main to find flake patterns. show.gh.action.logs.sh needs ONE run of a specific workflow.

---

**endpoint 2: get jobs for run**

detect.sh (line 210):
```bash
JOBS_JSON=$(gh api --method GET "repos/$REPO/actions/runs/$RUN_ID/jobs" -q '.jobs' 2>/dev/null || echo "[]")
```

show.gh.action.logs.sh (line 239):
```bash
JOBS_JSON=$(gh api --method GET "repos/$REPO/actions/runs/$RUN_ID/jobs" -q '.jobs')
```

nearly identical! but examine the context:

| context | detect.sh | show.gh.action.logs.sh |
|---------|-----------|------------------------|
| error handler | `|| echo "[]"` (fail silent, continue batch) | strict (fail fast, interactive) |
| iteration | processes 10+ runs in loop | processes 1 run |
| post-process | extracts failed job ids only | optionally filters by scope |
| downstream | feeds into flake inventory aggregation | feeds into log display |

**verdict:** same one-liner, but wrapped in completely different control flow. extraction would require pass of error-handle strategy as parameter, which adds complexity for a one-line call.

---

**endpoint 3: get job logs**

detect.sh (line 217):
```bash
LOGS=$(gh api --method GET "repos/$REPO/actions/jobs/$JOB_ID/logs" 2>&1 || echo "")
```

show.gh.action.logs.sh (line 298):
```bash
LOGS=$(gh api --method GET "repos/$REPO/actions/jobs/$JOB_ID/logs" 2>&1 || true)
```

again nearly identical! but examine error handle:

detect.sh:
```bash
if [[ -z "$LOGS" || "$LOGS" == "null" ]]; then
  continue  # skip to next job, don't fail
fi
```

show.gh.action.logs.sh (lines 291-319):
```bash
MAX_RETRIES="${RETRY_LIMIT:-30}"
SLEEP_SECONDS="${RETRY_DELAY:-3}"
for ((i=1; i<=MAX_RETRIES; i++)); do
  LOGS=$(gh api ...)
  if [[ -n "$LOGS" && "$LOGS" != "null" && ! "$LOGS" =~ "still active" ... ]]; then
    LOGS_READY=true
    break
  fi
  echo "   🫧 logs not ready, will retry in ${SLEEP_SECONDS}s..."
  sleep "$SLEEP_SECONDS"
done
```

**massive difference:** show.gh.action.logs.sh retries up to 30 times with 3s delays (90s total) because logs may not be immediately available for in-progress runs. detect.sh scans historical runs where logs are already available, so no retry needed.

**verdict:** same endpoint, fundamentally different retry semantics. a shared utility would need retry configuration, which defeats the purpose.

---

#### what would extraction look like?

hypothetical shared utility:

```bash
# shared/gh.api.sh
get_jobs_for_run() {
  local repo="$1"
  local run_id="$2"
  local on_error="${3:-fail}"  # "fail" | "empty" | "retry"
  local retry_count="${4:-1}"
  local retry_delay="${5:-0}"

  # ... 30 lines of conditional error handle
}
```

then detect.sh becomes:
```bash
source "$SKILL_DIR/../shared/gh.api.sh"
JOBS_JSON=$(get_jobs_for_run "$REPO" "$RUN_ID" "empty" 1 0)
```

and show.gh.action.logs.sh becomes:
```bash
source "$SCRIPT_DIR/shared/gh.api.sh"
JOBS_JSON=$(get_jobs_for_run "$REPO" "$RUN_ID" "retry" 30 3)
```

**cost of extraction:**
1. new shared file to maintain
2. parameter explosion for different strategies
3. harder to read (indirection)
4. harder to modify (change shared affects both)
5. test complexity increases

**benefit of extraction:**
1. one fewer line repeated (the gh api call itself)

**conclusion:** extraction trades one line of duplication for significant complexity. the `gh api` call IS the abstraction — to wrap it further over-engineers.

---

#### why parallel implementations hold

1. **gh cli is already the abstraction** — `gh api` provides auth, pagination, error format. to wrap it again adds no value.

2. **control flow differs fundamentally** — detect.sh is batch process with fail-silent semantics. show.gh.action.logs.sh is interactive with user-feedback retries.

3. **evolution paths differ** — detect.sh may add rate limit, cache, or different filter. show.gh.action.logs.sh may add stream or pagination for huge logs. to couple would force coordinated changes.

4. **the overlap is superficial** — yes, both call the same api endpoints. but the 10 lines of api calls are embedded in 100+ lines of skill-specific logic each. 10% overlap does not warrant extraction.

5. **rule.prefer.wet-over-dry applies** — we have 2 usages, not 3+. wait for a third skill that needs gh api before extract.

**verdict:** acceptable parallel implementation. same API, different semantics. extraction would over-engineer.

### 5. templates

**extant:** `declapract.upgrade/templates/`

**assessment:** templates are skill-specific content. deflake workflow has different stones than upgrade workflow.

**verdict:** holds. no duplication - different workflows.

## open questions

none. all mechanisms are either:
1. pattern reuse (intentional consistency)
2. parallel implementation (same API, different semantics)
3. skill-specific content (templates)

## conclusion

no mechanism duplication found that warrants extraction. the parallel gh api usage in `detect.sh` and `show.gh.action.logs.sh` is acceptable because they serve different purposes with different semantics.
