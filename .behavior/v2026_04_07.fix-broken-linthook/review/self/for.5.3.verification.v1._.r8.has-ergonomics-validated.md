# self-review r8: has-ergonomics-validated

## the question

does the actual input/output match what felt right in the vision?

---

## planned vs actual: input

### planned (from vision)

```
rhx git.repo.test --what <lint|types|unit|integration|format> [--when hook.onStop]
```

### actual

```
rhx git.repo.test.run --what lint [--when hook.onStop]
```

### drift analysis

| aspect | planned | actual | match? |
|--------|---------|--------|--------|
| command name | git.repo.test | git.repo.test.run | drift |
| --what flag | required | required | ✓ |
| --what values | lint,types,unit,integration,format | lint only | partial |
| --when flag | optional | optional | ✓ |

### drift explanation

1. **command name**: `.run.sh` suffix was added to escape rsync exclude pattern `**/*.test.sh`. this is a technical constraint, not a design decision.

2. **--what values**: only `lint` is implemented. the vision anticipated future values (types, unit, etc.) but the wish only asked for lint. this is correct scope management.

### is the drift acceptable?

| drift | acceptable? | reason |
|-------|-------------|--------|
| `.run.sh` suffix | yes | technical constraint from build system |
| lint-only --what | yes | wish scope was lint, not all test types |

---

## planned vs actual: output (success)

### planned (from vision)

```
🐢 cowabunga!

🐚 git.repo.test --what lint
   ├─ status: passed
   └─ log: .log/role=mechanic/skill=git.repo.test/ISOTIME.stdout.log
```

### actual (from test execution)

```
🐢 cowabunga!

🐚 git.repo.test --what lint
   ├─ status: passed
   └─ log: .log/role=mechanic/skill=git.repo.test/2026-04-07T13-13-22Z.stdout.log
```

### match: yes

the output matches the vision exactly. the only difference is the actual timestamp vs the ISOTIME placeholder, which is expected.

---

## planned vs actual: output (failure)

### planned (from vision)

```
🐢 bummer dude...

🐚 git.repo.test --what lint
   ├─ status: failed
   ├─ defects: 7
   ├─ log: .log/role=mechanic/skill=git.repo.test/ISOTIME.stderr.log
   └─ tip: try `npm run fix` then rerun, or Read the log path above for details
```

### actual (from snapshot)

```
🐢 bummer dude...

🐚 git.repo.test --what lint
   ├─ status: failed
   ├─ defects: 7
   ├─ log: .log/role=mechanic/skill=git.repo.test/ISOTIME.stdout.log
   └─ 💡 tip: try `npm run fix` then rerun, or Read the log path above for details
```

### match analysis

| element | planned | actual | match? |
|---------|---------|--------|--------|
| turtle header | 🐢 bummer dude... | 🐢 bummer dude... | ✓ |
| status | failed | failed | ✓ |
| defects count | 7 | 7 | ✓ |
| log path | .stderr.log | .stdout.log | drift |
| tip | tip: | 💡 tip: | enhancement |

### drift: .stderr.log vs .stdout.log

the vision said `.stderr.log` but the actual uses `.stdout.log`. the reason: eslint writes to stdout, not stderr. the implementation is correct; the vision was imprecise.

### enhancement: 💡 emoji

the actual output adds a 💡 emoji before "tip". this is a visual improvement that helps the tip stand out. the enhancement is acceptable.

---

## planned vs actual: exit codes

### planned (from vision)

```
exit code:      0 = pass, 2 = constraint (defects found)
```

### actual (from tests and implementation)

| scenario | planned | actual | match? |
|----------|---------|--------|--------|
| lint passes | 0 | 0 | ✓ |
| lint fails | 2 | 2 | ✓ |
| npm error | 1 (malfunction) | 1 | ✓ |

### match: yes

exit code semantics match the vision exactly.

---

## conclusion

the ergonomics match the vision with minor acceptable drift:

| aspect | drift | acceptable? | reason |
|--------|-------|-------------|--------|
| command name | .run.sh suffix | yes | build constraint |
| --what values | lint only | yes | wish scope |
| log path | .stdout.log | yes | eslint writes to stdout |
| tip emoji | 💡 added | yes | visual improvement |

no drift requires a fix. the implementation honors the planned ergonomics.
