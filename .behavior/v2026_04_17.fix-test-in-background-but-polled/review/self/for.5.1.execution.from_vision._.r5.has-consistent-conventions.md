# self-review r5: has-consistent-conventions

deeper comparison of actual hook code.

## style variations in extant hooks

compared two extant hooks side by side:

### forbid-stderr-redirect.sh (older style)
- `# Read JSON from stdin` (capital R)
- guarantee: uses `✔` checkmarks
- `# failfast: if no input received, error state`

### forbid-suspicious-shell-syntax.sh (newer style)
- `# read JSON from stdin` (lowercase r)
- guarantee: uses `-` dashes
- `# failfast: if no input received, exit with error`

### our hook
- `# read JSON from stdin` (lowercase r)
- guarantee: uses `-` dashes
- `# failfast: if no input received, exit with error`

**verdict:** our hook matches the NEWER style (suspicious-shell-syntax), which is more recent and more consistent with the lowercase convention used in this repo.

## no action needed

the variation between extant hooks is a historical artifact. our hook follows the newer convention, which is:
- lowercase comments
- dashes in guarantee section
- concise failfast comment

no convention violations found.
