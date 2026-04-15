# self-review: has-preserved-test-intentions

## the question

did you preserve test intentions? no weakened assertions, no removed cases, no changed expectations to match broken output.

## what tests were touched

the cicd.deflake.integration.test.ts is a **new test file**. no prior tests were modified.

## do the new tests verify real behavior?

walked each test case:

### case1: init creates route and binds

**intention**: verify init creates route directory with expected files
**verified via**:
- `expect(result.exitCode).toBe(0)` — command succeeds
- `expect(dirExists).toBe(true)` — directory created
- `expect(files).toContain('1.evidence.stone')` — contains stones
- `expect(files).toContain('2.1.diagnose.research.guard')` — contains guards

### case2: init output format

**intention**: verify output matches expected turtle vibes format
**verified via**:
- `expect(result.stdout).toMatchSnapshot()` — exact format captured
- snapshot preserves contract output for PR review

### case3: init already bound (findsert semantics)

**intention**: verify idempotent behavior — same route reused
**verified via**:
- `expect(secondRun.stdout).toContain('route already bound')` — detects prior bind
- `expect(secondRun.exitCode).toBe(0)` — succeeds without error

### case4-8: error cases

**intention**: verify proper error codes and messages for invalid inputs
**verified via**:
- `expect(result.status).toEqual(2)` — constraint error
- `expect(result.stdout).toContain(...)` — helpful error message
- `expect(result.stdout).toMatchSnapshot()` — exact format captured

### case9: detect positive path with --into (mocked gh cli)

**intention**: verify detect scans and writes inventory when gh cli works
**verified via**:
- `expect(result.status).toEqual(0)` — command succeeds
- `expect(fs.existsSync(inventoryPath)).toBe(true)` — inventory file created
- `expect(inventory.flakes).toEqual([])` — empty flakes array returned
- `expect(inventory.metadata.branch).toEqual('main')` — metadata present
- `expect(stdoutStable).toMatchSnapshot()` — output format captured

### case10: detect gh auth failure (mocked gh cli)

**intention**: verify detect fails gracefully when gh cli not authenticated
**verified via**:
- `expect(result.status).toEqual(2)` — constraint error
- `expect(result.stdout).toContain('not authenticated')` — helpful error
- `expect(result.stdout).toMatchSnapshot()` — error format captured

### case11: real GitHub API integration

**intention**: verify detect works against real GitHub Actions API
**verified via**:
- throws ConstraintError if gh cli not authenticated (failfast, not skip)
- `expect(result.status).toEqual(0)` — real API call succeeds
- `expect(result.stderr).toMatchSnapshot()` — stderr captured
- `expect(stdoutStable).toMatchSnapshot()` — stdout with dynamic content redacted
- `expect(inventory).toHaveProperty('flakes')` — real response shape verified
- `expect(inventory).toHaveProperty('metadata')` — real response shape verified
- `expect(inventory.metadata).toHaveProperty('branch')` — real metadata present
- `expect(inventory.metadata).toHaveProperty('scanned_at')` — real metadata present
- `expect(inventory.metadata).toHaveProperty('days')` — real metadata present
- `expect(inventory.metadata).toHaveProperty('runs_analyzed')` — real metadata present

## verdict

holds. all tests are new (no prior tests modified). each test verifies specific real behavior. case11 added to verify real external contract with GitHub API — no mocks, real gh cli, real API calls.
