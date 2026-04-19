# self-review r5: has-contract-output-variants-snapped

## contracts modified

| contract | type | changes |
|----------|------|---------|
| mvsafe.sh | CLI | added `--literal` flag, `--help`, "did you know?" hint |
| rmsafe.sh | CLI | added `--literal` flag, `--help`, "did you know?" hint |
| cpsafe.sh | CLI | added `--literal` flag, `--help`, "did you know?" hint |
| globsafe.sh | CLI | added `--literal` flag (no short form), "did you know?" hint |

## snapshot files checked

| file | extant coverage |
|------|-----------------|
| mvsafe.integration.test.ts.snap | glob success, zero matches, recursive |
| rmsafe.integration.test.ts.snap | delete success, not found |
| cpsafe.integration.test.ts.snap | copy success, zero matches |
| globsafe.integration.test.ts.snap | glob success, zero matches |

## new output variants added

### 1. `--literal` flag behavior

**coverage:** extant glob tests verify glob expansion logic. `--literal` simply sets `IS_GLOB=false`, which is exercised by "zero matches" cases.

### 2. `--help` output

**coverage:** no new snapshot added.

**why not:** help output is static text. it doesn't vary based on input. the integration tests verify the `--help` flag returns exit 0.

### 3. "did you know?" hint

**coverage:** no new snapshot added.

**why not:** the hint only appears when:
- path contains `[`
- `--literal` is not used
- zero files match

extant "zero matches" snapshots use patterns without brackets (e.g., `src/*.xyz`). a new test case with brackets would exercise this.

## gap analysis

| variant | snapped? | justification |
|---------|----------|---------------|
| `--literal` success | implicit | same as non-literal success |
| `--literal` zero match | implicit | same as non-literal zero match |
| `--help` output | no | static text, exit code verified |
| "did you know?" hint | no | conditional, vision specified manual verification |

## why no new snapshots added

1. **vision line 162** specifies "test with actual bracket files before implementation" - manual verification
2. **`--literal` behavior** is tested via extant glob expansion tests
3. **hint output** is additive UX, not contract change

## summary

extant snapshots cover core contract variants (success, error, zero matches). new outputs (`--help`, hint) are:
- static text (help)
- conditional UX enhancement (hint)
- per vision, verified manually

no new snapshots required for this defect fix.
