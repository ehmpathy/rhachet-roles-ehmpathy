# self-review r7: has-critical-paths-frictionless

## critical paths (from vision)

### path 1: run unit tests with no changes
```bash
$ rhx git.repo.test --what unit
```

**manual test result:**
- exit 0
- shows "status: skipped"
- shows "files: 0"
- shows coconut tip

**friction:** none. clear message, correct exit code.

### path 2: run integration tests scoped to changed file
```bash
$ rhx git.repo.test --what integration --scope 'git.repo.test.play' --thorough
```

**manual test result:**
- exit 0
- matched 1 file
- 64 tests passed

**friction:** none. tests run as expected.

### path 3: scope with name qualifier (from vision)
```bash
$ rhx git.repo.test --what unit --scope 'name(foo)'
```

**verification:** this path parses correctly. the scope parser extracts "name" mode and "foo" pattern. jest receives --testNamePattern.

**friction:** none when tests exist. if no tests match, clear constraint error.

## could there be friction?

### what if user runs with blocked flag?
```bash
$ rhx git.repo.test --what unit -- --testNamePattern "foo"
```

**expected:** block with guidance
**actual:** block with guidance (constraint error + coconut tip)

**friction:** the block is intentional friction. the coconut tip provides the escape path.

### what if user expects tests but none run?
the coconut tip says "use --scope and --thorough to target tests directly." this is the escape path.

**friction:** minimal. user gets clear guidance.

## summary

all critical paths are frictionless. the new "no tests without scope" path exits 0 with helpful guidance. the block path provides clear alternative (--scope).
