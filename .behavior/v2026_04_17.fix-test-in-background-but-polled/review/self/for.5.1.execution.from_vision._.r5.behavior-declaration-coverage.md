# self-review r5: behavior-declaration-coverage

re-read both wish and vision to verify full coverage.

## from the wish

### wish line 7: "they run `rhx git.repo.test --...` in the background"

**coverage:** hook pattern matches:
- `rhx git.repo.test`
- `rhx git.repo.test --what unit`
- `rhx git.repo.test --what integration --scope foo`

verified via regex: `rhx[[:space:]]+git\.repo\.test`

**verdict:** covered.

### wish line 21: "is there a way to block a bot from run tests in background?"

**coverage:** yes, the pre-tool hook blocks this at invocation time.

**verdict:** covered.

### wish line 23: "for now, hard rule"

**coverage:** no escape hatch implemented. hook always blocks background.

**verdict:** covered.

### wish line 61: "can we prevent auto background?"

**coverage:** we researched this - no auto-background exists in Claude Code. clones explicitly pass `run_in_background: true`. hook blocks this.

**verdict:** covered via hook.

## from the vision

### vision line 70: "invoke the skill with `run_in_background: true`"

**coverage:** hook checks this exact field.

**verdict:** covered.

### vision line 113: edgecase table

| edgecase | expected | implemented |
|----------|----------|-------------|
| clone tries background | immediate error | exit 2 + message |
| clone runs foreground | works | exit 0 |

**verdict:** both covered.

## summary

| source | requirement | status |
|--------|-------------|--------|
| wish | block rhx git.repo.test background | covered |
| wish | hard rule, no escape | covered |
| wish | prevent "auto-background" | n/a (doesn't exist) |
| vision | block run_in_background | covered |
| vision | edgecases | covered |

all requirements from wish and vision are addressed. no gaps found.
