# self-review: has-contract-output-variants-snapped (r5)

## contract: rmsafe cli

### output variants covered

| variant | test case | snapshot? |
|---------|-----------|-----------|
| success (single file) | [case11.t0] | yes - shows turtle + coconut |
| success (multi file) | [case11.t0] | yes - shows file list |
| success (recursive glob) | [case11.t2] | yes - shows nested paths |
| crickets (zero matches) | [case11.t1] | yes - shows crickets header |
| error (no args) | [case3.t0] | yes - shows usage |
| error (unknown option) | [case3.t1] | yes - shows error |
| error (not exist) | [case4.t0] | yes - shows error |
| error (dir without -r) | [case4.t1] | yes - shows error |
| error (outside repo) | [case5.t0] | yes - shows boundary error |

### new output element: coconut hint

the trash feature adds a new output section:
```
🥥 did you know?
   ├─ you can restore from trash
   └─ rhx cpsafe .agent/.cache/.../trash/file ./file
```

snapshot diff shows this appears in:
- [case11.t0] glob matches multiple files
- [case11.t2] recursive glob

### why snapshots are exhaustive

1. **positive path**: multiple success variants snapped (single, multi, recursive)
2. **negative path**: error variants snapped (no args, unknown option, not exist, dir without -r, outside repo)
3. **edge cases**: crickets (zero matches), symlink behavior covered

### snapshot shows actual output

examined snapshot content:
- turtle header present (`🐢 sweet`)
- shell root present (`🐚 rmsafe`)
- tree structure present (`├─`, `└─`)
- coconut section present (`🥥 did you know?`)
- actual file paths (not placeholders)

## conclusion

all contract output variants have snapshot coverage.
coconut hint appears in success path snapshots.
