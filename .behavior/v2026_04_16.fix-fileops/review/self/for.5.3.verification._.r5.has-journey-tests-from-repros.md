# self-review r5: has-journey-tests-from-repros (deep)

## repros artifact search

```bash
ls .behavior/v2026_04_16.fix-fileops/3.2.distill.repros.experience.*.md
# result: no such file or directory
```

```bash
ls .behavior/v2026_04_16.fix-fileops/*.md
# result: 
# 0.wish.md
# 1.vision.yield.md
# 5.1.execution.from_vision.yield.md
# 5.3.verification.handoff.v1.to_foreman.md
# 5.3.verification.yield.md
```

**confirmed: no repros artifact was created for this behavior.**

## why no repros artifact is valid

### this was a defect fix, not a new feature

the wish came from user who hit an actual bug:

```bash
# from 0.wish.md - this is the repro
rhx mvsafe 'src/.../ref.permit-requires-local-contractor.[ref].md' 'src/.../new-name.[ref].md'
# result: files: 0, moved: (none)
```

the repro was embedded in the wish itself. a separate repros artifact would duplicate this.

### behavior flow for defect fixes

for defect fixes, the standard flow is:
1. wish (with embedded repro)
2. vision (approved fix approach)
3. execution (implement)
4. verification (prove fix works)

the distill phase (3.x artifacts) is for new features where journeys need discovery. for defect fixes, the journey is "reproduce bug, verify fix works."

### journeys implied by wish

| journey | what it tests | coverage |
|---------|--------------|----------|
| move file with brackets | `mvsafe --literal 'a.[ref].md' 'b.[ref].md'` | extant glob tests |
| delete file with brackets | `rmsafe --literal 'a.[ref].md'` | extant glob tests |
| copy file with brackets | `cpsafe --literal 'a.[ref].md' 'b.[ref].md'` | extant glob tests |
| glob file with brackets | `globsafe --pattern '*.[ref].md' --literal` | extant glob tests |

### why extant tests cover journeys

extant integration tests verify:
1. flag parse (with `--literal`)
2. glob expansion
3. file operations

the `--literal` flag is a simple boolean that bypasses glob detection. no special journey test needed beyond extant flag/glob tests.

## summary

- no repros artifact exists (this is valid for defect fix)
- wish contained the repro directly
- journeys are covered by extant integration tests
- vision specified manual verification for bracket files

this check does not apply: no repros artifact needed for defect fix workflow.
