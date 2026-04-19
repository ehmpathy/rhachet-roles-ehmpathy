# self-review r5: behavior-declaration-coverage (fixed)

## issue found and fixed

### vision header had outdated scope pattern description

**issue:** vision line 154 said "match file path OR test name" for bare scope

**root cause:** vision was written before we finalized that bare scope = path only (backwards compatible). the vision header comment was not updated.

**fix applied:** updated vision line 154 to say "match file path (default, backwards compatible)" - now matches actual code header

## re-verified all requirements

re-read both wish and vision line by line. all requirements now covered:

### from wish (0.wish.md)
> failfast guide away from this -- --testNamePattern "..." type of usage

**verification:**
- code blocks `-- --testNamePattern` with exit 2
- outputs 🥥 tip with correct alternative
- holds

### from vision (1.vision.yield.md)

| line | requirement | status |
|------|-------------|--------|
| 23 | `--scope 'name(...)'` works | ✓ tested in scope parser |
| 34-39 | block message with 🥥 tip | ✓ matches code output |
| 56 | `--scope 'name(...)'` for test names | ✓ implemented |
| 173 | backwards compatible path filter | ✓ bare scope = path |
| 184 | `-- --verbose` allowed | ✓ not in blocked list |
| 185-186 | testNamePattern/testPathPattern blocked | ✓ in REST_ARGS check |

## summary

one issue found: vision header was outdated
fix applied: updated vision to match implementation

all requirements now verified covered.
