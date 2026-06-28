# ref.reviewer.test-infrastructure-context

## .what

clarifies that behavior hazard rules apply differently to test infrastructure vs production code.

## .context for reviewers

test infrastructure (test harnesses, eval systems, integration test utilities) inherently requires:

1. **external dependencies** — tests call real services to verify integration works
2. **credential setup** — `keyrack unlock` precedes tests (like db connection precedes db tests)
3. **non-determinism** — eval systems intentionally call real brains to measure performance

## .how to apply

before you flag behavior hazards in test code, ask:

| hazard type | production code | test infrastructure |
|-------------|-----------------|---------------------|
| non-determinism | flag unless documented | expected for evals (the point is to test real behavior) |
| order-dependence | flag (assumes prior call) | expected for setup (credentials, fixtures) |
| external state | flag (hidden side effects) | expected (tests verify external integrations) |
| time assumptions | flag (no timeout/backoff) | delegate to base tools (rhx, brain infra) |

## .when to flag vs defer

**flag as blocker:**
- production code with undocumented non-determinism
- production code with hidden side effects
- test code that hides failures (failhide)
- test code without proper error surface

**defer to convention:**
- test infrastructure that calls external services (integration tests)
- eval systems that call real brains (performance measurement)
- credential unlock as test prerequisite (standard pattern)
- timeout/retry in base tools vs test harness

## .note

the rule's `.note` says: "if behavior hazards are truly unavoidable (rare), document them explicitly with rationale."

test infrastructure documents its external dependencies by nature — the blueprint section that describes evals IS the documentation.
