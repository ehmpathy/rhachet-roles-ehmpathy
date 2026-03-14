# handoff: test-fns flaky genTempDir symlink race

## .what

`genTempDir` has a race condition when multiple tests run in parallel. the symlink creation fails with `EEXIST`.

## .error

```
EEXIST: file already exists, symlink '/tmp/test-fns/rhachet-roles-ehmpathy/.temp' -> '/home/runner/work/rhachet-roles-ehmpathy/rhachet-roles-ehmpathy/.temp/genTempDir.symlink'
```

## .repro

1. run tests in parallel that both call `genTempDir({ slug: '...', git: true })`
2. both try to create the same symlink at `/tmp/test-fns/{repo}/.temp`
3. second one fails with EEXIST

in CI, this manifests as:
```
FAIL src/domain.roles/mechanic/skills/claude.tools/symlink.integration.test.ts
  symlink.sh › given: [case1] create relative symlink › when: [t0] --mode relative is specified › then: symlink is created
```

## .root cause

`genIsolatedTempInfra` (line 97 in test-fns) creates a symlink from a shared location to each test's temp dir. when tests run in parallel:

1. test A: checks if symlink extant → no
2. test B: checks if symlink extant → no
3. test A: creates symlink → success
4. test B: creates symlink → EEXIST

## .fix approaches

### option 1: make symlink creation idempotent

```typescript
// in genIsolatedTempInfra.ts
try {
  await fs.symlink(tempDir, symlinkPath);
} catch (err) {
  if (err.code === 'EEXIST') {
    // symlink already extant, check if it points to our target
    const extant = await fs.readlink(symlinkPath);
    if (extant !== tempDir) {
      // different target - remove and recreate
      await fs.unlink(symlinkPath);
      await fs.symlink(tempDir, symlinkPath);
    }
    // else: already points to our target, no-op
  } else {
    throw err;
  }
}
```

### option 2: unique symlink per test

instead of shared `/tmp/test-fns/{repo}/.temp`, use `/tmp/test-fns/{repo}/.temp.{uuid}` or include test name in path.

### option 3: skip symlink if extant

if the symlink is only for convenience (e.g., finding latest temp dir), just skip if extant:

```typescript
try {
  await fs.symlink(tempDir, symlinkPath);
} catch (err) {
  if (err.code !== 'EEXIST') throw err;
  // swallow EEXIST - another test won the race
}
```

## .files to modify

- `node_modules/.pnpm/test-fns@.../test-fns/src/infra/isomorph.fs/genIsolatedTempInfra.ts` (line ~97)
- or the source in test-fns repo: `src/infra/isomorph.fs/genIsolatedTempInfra.ts`

## .validation

after fix:
```sh
# run symlink tests multiple times in parallel
for i in {1..10}; do npm run test:integration -- symlink.integration.test.ts & done; wait
```

all runs should pass without EEXIST errors.

## .priority

low — this is a rare flaky test that only surfaces in CI with high parallelism. workaround is to rerun failed jobs.

