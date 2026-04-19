# self-review: behavior-declaration-adherance

## line-by-line check: vision vs implementation

### vision line 31: `🐢 hold up, dude...`
**code:** line 324: `print_turtle_header "hold up, dude..."`
**match:** ✓ exact

### vision line 34: `└─ ✋ blocked: raw --testNamePattern detected`
**code:** line 326: `echo "   └─ ✋ blocked: raw --testNamePattern detected"`
**match:** ✓ exact

### vision lines 36-39: 🥥 tip structure
**vision:**
```
🥥 did you know?
   ├─ --scope 'foo' filters by file path
   ├─ --scope 'path(foo)' filters by file path (explicit)
   └─ --scope 'name(foo)' filters by test name
```
**code:** lines 328-331
```bash
echo "🥥 did you know?"
echo "   ├─ --scope 'foo' filters by file path"
echo "   ├─ --scope 'path(foo)' filters by file path (explicit)"
echo "   └─ --scope 'name(foo)' filters by test name"
```
**match:** ✓ exact

### vision line 103: exits 2 (constraint)
**code:** line 337: `exit 2`
**match:** ✓ exact

### vision lines 184-186: edge cases table
| vision | code status |
|--------|-------------|
| `-- --verbose` allow | ✓ not in blocked list |
| `-- --testNamePattern` block | ✓ line 322 blocks |
| `-- --testPathPattern` block | ✓ line 340 blocks |
| `-- --coverage` allow | ✓ not in blocked list |

### vision line 147: `--scope 'invoice'` = path filter
**code:** SCOPE_MODE="both" case maps to testPathPatterns (line 669-670)
**match:** ✓ correct behavior

### vision line 148: `--scope 'path(...)'` explicit
**code:** SCOPE_MODE="path" case maps to testPathPatterns (line 669-670)
**match:** ✓ correct behavior

### vision line 149: `--scope 'name(...)'` test names
**code:** SCOPE_MODE="name" case maps to testNamePattern (line 666-667)
**match:** ✓ correct behavior

## summary

all implementation matches vision specification exactly. no deviations found.
