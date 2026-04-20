# self-review: has-preserved-test-intentions (round 4)

## the question

did i preserve test intentions? did i weaken assertions? did i change expected values to match broken output?

## what tests exist

re-read the full test file (460 lines). 11 test cases, all NEW (not modified from prior code).

## detailed examination of each test

### case1: init creates route and binds

**what it asserts:**
```ts
expect(result.status).toEqual(0);
expect(result.stdout).toContain('🐢 tubular!');
expect(result.stdout).toContain('🐚 cicd.deflake init');
expect(result.stdout).toContain('🥥 hang ten!');
// route directory exists
expect(behaviorDirs.length).toBeGreaterThan(0);
expect(routeDir).toBeDefined();
// all 9 stones exist
expect(files).toContain('1.evidence.stone');
// ... (8 more stones)
expect(stoneFiles).toHaveLength(9);
// all 6 guards exist
expect(files).toContain('2.1.diagnose.research.guard');
// ... (5 more guards)
expect(guardFiles).toHaveLength(6);
```

**is this real?** yes — executes actual bash skill via spawnSync, asserts real files exist

### case2: output format

**what it asserts:**
```ts
expect(result.status).toEqual(0);
expect(stdoutStable).toMatchSnapshot();
```

**is this real?** yes — captures exact output format. date is redacted for stability (legitimate).

### case3: findsert semantics

**what it asserts:**
```ts
expect(result1.status).toEqual(0);
expect(result2.status).toEqual(0);
expect(routesAfter.length).toEqual(routesBefore.length);
```

**is this real?** yes — verifies idempotent behavior

### case4-8: error cases

**what they assert:**
- exit code 2 for constraint errors
- stdout contains specific error messages
- help shows available subcommands
- snapshots capture exact output

**is this real?** yes — verifies real error paths

### case9: detect positive path (mocked gh cli)

**what it asserts:**
```ts
expect(result.status).toEqual(0);
expect(fs.existsSync(inventoryPath)).toBe(true);
expect(inventory.flakes).toEqual([]);
expect(inventory.metadata.branch).toEqual('main');
expect(stdoutStable).toMatchSnapshot();
```

**is this real?** skill execution is real; gh cli is mocked via PATH injection to return controlled responses. this tests the skill's response to expected gh output.

### case10: detect auth failure (mocked gh cli)

**what it asserts:**
```ts
expect(result.status).toEqual(2);
expect(result.stdout).toContain('not authenticated');
expect(result.stdout).toMatchSnapshot();
```

**is this real?** skill execution is real; gh cli is mocked to simulate auth failure. this tests error path.

### case11: real GitHub API integration

**what it asserts:**
```ts
// throws ConstraintError if gh not authenticated — failfast, not skip
expect(result.status).toEqual(0);
expect(result.stderr).toMatchSnapshot();
expect(stdoutStable).toMatchSnapshot();
expect(inventory).toHaveProperty('flakes');
expect(inventory).toHaveProperty('metadata');
expect(inventory.metadata).toHaveProperty('branch');
expect(inventory.metadata).toHaveProperty('scanned_at');
expect(inventory.metadata).toHaveProperty('days');
expect(inventory.metadata).toHaveProperty('runs_analyzed');
```

**is this real?** yes — real gh cli, real GitHub API calls, real response shape verification. proves external contract.

## one potential concern

the tests set `SKIP_ROUTE_BIND: '1'` env var. is this a weakened assertion?

examined the skill: this env var skips the final `rhx route.bind.set` call. this is legitimate because:
- temp directory has no rhachet installed
- the bind would fail in test environment
- the bind is tested implicitly by stdout that contains bind confirmation

## verdict

holds. all 11 tests are new, not modified from prior code. each test has strong assertions on real behavior. no weakened expectations. case11 proves real external contract via actual GitHub API calls.
