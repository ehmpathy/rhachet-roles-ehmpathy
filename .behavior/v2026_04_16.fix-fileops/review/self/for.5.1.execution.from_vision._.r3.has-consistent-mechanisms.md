# self-review r3: has-consistent-mechanisms

## code search evidence

### search 1: extant boolean flag pattern

```bash
grep 'RECURSIVE=' src/domain.roles/mechanic/skills/claude.tools/
```

**result:**
- `rmsafe.sh:39: RECURSIVE=false`
- `rmsafe.sh:50: RECURSIVE=true`

**conclusion:** our `LITERAL=false` / `LITERAL=true` pattern matches extant `RECURSIVE` pattern exactly.

### search 2: extant output functions

```bash
grep 'print_turtle_header' src/domain.roles/mechanic/skills/claude.tools/
```

**result:** found in output.sh and used by all *safe skills.

**our usage:** we use `print_turtle_header "crickets..."` and `print_tree_*` functions same as extant code.

**exception:** "did you know?" hint uses raw `echo` - but output.sh has no coconut/hint function.

### search 3: extant help patterns

```bash
grep '\-\-help' src/domain.roles/mechanic/skills/claude.tools/*.sh
```

**result:** globsafe.sh already had `--help|-h` handler. We added same pattern to mvsafe/rmsafe/cpsafe.

## mechanisms verified as consistent

| mechanism | evidence | pattern source |
|-----------|----------|----------------|
| `LITERAL=false` | grep result | rmsafe.sh:RECURSIVE |
| case statement | visual compare | all *safe skills |
| output functions | grep result | output.sh |
| `--help` handler | grep result | globsafe.sh |

## "did you know?" hint - acceptable deviation

**why raw echo?** output.sh does not have:
- `print_hint_header`
- `print_coconut_*`
- any hint-specific functions

**options considered:**
1. add to output.sh - scope creep, vision didn't request
2. use raw echo - minimal, works
3. use `print_tree_*` - wouldn't match the coconut visual

**decision:** raw echo is correct for one-off new visual element.

## no duplicate mechanisms

all new code reuses extant patterns where they exist.
