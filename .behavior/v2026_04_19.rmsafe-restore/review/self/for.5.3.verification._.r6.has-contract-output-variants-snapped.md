# self-review: has-contract-output-variants-snapped (r6)

## I read the snapshot file

opened `rmsafe.integration.test.ts.snap` and examined each snapshot.

### snapshot 1: success with multiple files

```
🐢 sweet

🐚 rmsafe
   ├─ path: build/*.tmp
   ├─ files: 2
   └─ removed
      ├─ build/a.tmp
      └─ build/b.tmp

🥥 did you know?
   ├─ you can restore from trash
   └─ rhx cpsafe .agent/.cache/.../trash/build/a.tmp ./build/a.tmp
```

what this proves:
- turtle header shows success vibe
- shell root shows command name
- tree shows path, file count, and removed files
- coconut hint shows restore command

### snapshot 2: crickets (zero matches)

```
🐢 crickets...

🐚 rmsafe
   ├─ path: build/*.xyz
   ├─ files: 0
   └─ removed
      └─ (none)
```

what this proves:
- turtle header shows crickets vibe (not success)
- file count is 0
- removed section shows (none)
- NO coconut hint (correct - no files trashed)

### snapshot 3: recursive glob with nested paths

```
🐢 sweet

🐚 rmsafe
   ├─ path: src/**/*.bak
   ├─ files: 3
   └─ removed
      ├─ src/core/bar.bak
      ├─ src/deep/nested/baz.bak
      └─ src/utils/foo.bak

🥥 did you know?
   ...
```

what this proves:
- recursive glob (`**/*.bak`) works
- nested paths shown correctly
- coconut hint present

### variants exhaustively covered

| variant | snapped? | evidence |
|---------|----------|----------|
| success (multi file) | yes | snapshot 1 |
| crickets (zero match) | yes | snapshot 2 |
| recursive glob | yes | snapshot 3 |
| coconut hint | yes | snapshots 1, 3 |
| no hint on crickets | yes | snapshot 2 |

### why no additional snapshots needed

error cases (no args, unknown option, etc.) are tested via:
- `expect(result.exitCode).toBe(2)`
- `expect(result.stderr).toContain('error:')`

these verify behavior without output snapshots because
error messages are user-visible but not treestruct-formatted.

## conclusion

all output variants that matter for vibecheck are snapped.
snapshot content demonstrates actual treestruct output.
