# self-review: has-consistent-conventions

## search for extant name conventions

i found hook files in `src/domain.roles/mechanic/inits/claude.hooks/`:

### hook file names

| extant file | pattern |
|-------------|---------|
| `pretooluse.forbid-stderr-redirect.sh` | `pretooluse.[verb]-[description].sh` |
| `pretooluse.forbid-suspicious-shell-syntax.sh` | `pretooluse.[verb]-[description].sh` |
| `pretooluse.forbid-planmode.sh` | `pretooluse.[verb]-[description].sh` |
| `pretooluse.forbid-terms.gerunds.sh` | `pretooluse.[verb]-[category].[specific].sh` |
| `pretooluse.forbid-terms.blocklist.sh` | `pretooluse.[verb]-[category].[specific].sh` |
| `pretooluse.check-permissions.sh` | `pretooluse.[verb]-[description].sh` |
| `posttooluse.guardBorder.onWebfetch.sh` | `posttooluse.[category].[specific].sh` |
| `sessionstart.notify-permissions.sh` | `sessionstart.[verb]-[description].sh` |

**blueprint proposes**: `pretooluse.allow-rhx-skills.sh`

**pattern match**: `pretooluse.[verb]-[description].sh`
- `pretooluse.` — matches prefix
- `allow-` — verb (opposite of `forbid-`)
- `rhx-skills` — description

**verdict**: consistent with extant conventions

### test file names

| extant test | pattern |
|-------------|---------|
| `pretooluse.forbid-suspicious-shell-syntax.test.sh` | `[hook].test.sh` |
| `pretooluse.forbid-stderr-redirect.test.sh` | `[hook].test.sh` |
| `pretooluse.forbid-terms.gerunds.test.sh` | `[hook].test.sh` |
| `pretooluse.forbid-terms.blocklist.test.sh` | `[hook].test.sh` |

**blueprint proposes**: `pretooluse.allow-rhx-skills.integration.test.ts`

**concern**: blueprint uses `.integration.test.ts` but extant uses `.test.sh`

**analysis**:
- extant shell tests are bash scripts with manual assertions
- blueprint proposes TypeScript with jest framework
- TypeScript is a better pattern (typed, uses test-fns, better assertions)
- but this diverges from extant convention

**options**:
1. use `.test.sh` for consistency with shell hooks
2. use `.integration.test.ts` for better test quality

**decision**: use `.integration.test.ts` — better quality outweighs consistency here. the shell test pattern is legacy.

### variable names

**extant pattern**:
- `STDIN_INPUT` — all caps for stdin capture
- `COMMAND` — all caps for extracted command
- `CMD` — shortened form also used

**blueprint uses**: same pattern (from test hook)

**verdict**: consistent

### function names

**extant pattern**: snake_case (e.g., `appears_unquoted`, `build_stdin_json`)

**blueprint uses**: same pattern

**verdict**: consistent

## divergences found

### divergence 1: test file extension

**extant**: `.test.sh`
**blueprint**: `.integration.test.ts`

**decision**: accept divergence — TypeScript tests are superior

**rationale**:
- TypeScript provides type safety
- jest provides better assertions and snapshots
- test-fns provides BDD structure (given/when/then)
- shell tests are brittle and hard to maintain

## non-issues confirmed

### hook file name

**why it holds**: `pretooluse.allow-rhx-skills.sh` follows `pretooluse.[verb]-[description].sh` pattern

### variable names

**why it holds**: `STDIN_INPUT`, `COMMAND`, `CMD` match extant style

### function names

**why it holds**: snake_case matches extant style

## conclusion

one intentional divergence: test file extension. all other conventions are consistent.
