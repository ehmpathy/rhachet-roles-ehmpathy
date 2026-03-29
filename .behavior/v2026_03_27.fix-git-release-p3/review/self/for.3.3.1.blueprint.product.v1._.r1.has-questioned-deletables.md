# review: has-questioned-deletables

## features review

### feature: and_then_await operation
- **traces to**: wish "single reusable await operation", vision "MANDATORY: commit-based freshness"
- **verdict**: keep. explicitly requested in wish.

### feature: commit-based freshness check
- **traces to**: wish "artifact MUST come AFTER the squash merge", vision "MANDATORY: commit-based freshness"
- **verdict**: keep. core behavioral requirement stated in ALL CAPS MANDATORY.

### feature: poll UI with elapsed time
- **traces to**: wish "await with poll UI", vision output examples show `├─ 💤 5s in await`
- **verdict**: keep. explicitly requested in wish desired output.

### feature: timeout diagnostics with workflow status
- **traces to**: wish "timeout diagnostics", vision "on timeout, lookup release-please workflow status"
- **verdict**: keep. explicitly requested in wish.

### feature: 18 test cases
- **traces to**: wish "test matrix" with 15 cases + criteria matrix adds 3 more granular stale cases
- **verdict**: keep. explicit test matrix defined in wish and criteria.

---

## components review

### component: get_fresh_release_pr()
- **can be removed?** no. needed to find PR and check freshness.
- **simplest version?** combine lookup + freshness in one function. already minimal.
- **verdict**: keep.

### component: get_fresh_tag()
- **can be removed?** no. needed to find tag and check freshness.
- **simplest version?** combine lookup + freshness in one function. already minimal.
- **verdict**: keep.

### component: get_release_please_status()
- **can be removed?** no. required for timeout diagnostics per wish.
- **simplest version?** single gh call with jq. already minimal.
- **verdict**: keep.

### component: print_await_poll()
- **can be removed?** could inline, but reuse in poll loop cleaner.
- **simplest version?** single echo with conditional connector. already minimal.
- **verdict**: keep.

### component: print_await_result()
- **can be removed?** could inline, but used for both found and timeout. cleaner as function.
- **simplest version?** case statement for two outcomes. already minimal.
- **verdict**: keep.

### component: print_workflow_status()
- **can be removed?** could inline in timeout logic. but nested tree format benefits from dedicated function.
- **simplest version?** already minimal - three echo statements.
- **verdict**: keep.

---

## deletable candidates reviewed

### candidate: AWAIT_RESULT variable
- **asked for?** not explicitly. but needed for caller to use the artifact found.
- **can delete?** yes, if caller re-fetches artifact after success.
- **verdict**: review with wisher. might be over-optimization. could simply exit 0 and let caller re-fetch.

**update**: kept. the caller needs to know which PR/tag was found to continue the flow. a re-fetch would be wasteful.

---

## summary

all features trace to wish/vision/criteria. no deletable features found.

all components are minimal. no unnecessary abstractions found.

blueprint is ready.

