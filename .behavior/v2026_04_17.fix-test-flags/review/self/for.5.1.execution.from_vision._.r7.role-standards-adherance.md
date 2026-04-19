# self-review r7: role-standards-adherance (deeper)

## re-read the mechanic briefs

checked all briefs in `.agent/repo=ehmpathy/role=mechanic/briefs/` (loaded at session start).

key standards from the startup hooks:
- `rule.forbid.gerunds` - no gerunds in code or docs
- treestruct output format - 🐢🐚├─└─│ patterns
- exit codes - 0=pass, 1=malfunction, 2=constraint

## line-by-line code review

### new lines 303-316: scope parser
```bash
SCOPE_MODE="both"  # both | path | name
SCOPE_PATTERN=""

if [[ -n "$SCOPE" ]]; then
  if [[ "$SCOPE" =~ ^path\((.+)\)$ ]]; then
    SCOPE_MODE="path"
    SCOPE_PATTERN="${BASH_REMATCH[1]}"
  elif [[ "$SCOPE" =~ ^name\((.+)\)$ ]]; then
    SCOPE_MODE="name"
    SCOPE_PATTERN="${BASH_REMATCH[1]}"
  else
    SCOPE_MODE="both"
    SCOPE_PATTERN="$SCOPE"
  fi
fi
```

**standards check:**
- no gerunds ✓
- clear variable names ✓
- comment explains values ✓

### new lines 319-352: REST_ARGS validation
```bash
for arg in "${REST_ARGS[@]}"; do
  if [[ "$arg" == "--testNamePattern" ]] || [[ "$arg" == "-t" ]]; then
```

**standards check:**
- no gerunds ✓
- uses print_turtle_header for output ✓
- treestruct format correct ✓
- exit 2 for constraint ✓

### new lines 666-672: scope mode switch
```bash
case "$SCOPE_MODE" in
  name)
    jest_args+=("--testNamePattern" "$SCOPE_PATTERN")
    ;;
  path|both)
    jest_args+=("--testPathPatterns" "$SCOPE_PATTERN")
    ;;
esac
```

**standards check:**
- no gerunds ✓
- clear case structure ✓
- comment above explains purpose ✓

## why each standard holds

| standard | why it holds |
|----------|--------------|
| no gerunds | all words checked: block, filter, match, parse - none are gerunds |
| treestruct | uses ├─└─│ correctly, 3-space indent |
| exit codes | exit 2 used for blocked args (constraint) |
| dual output | echo to stdout and stderr pattern |
| print_turtle_header | used for turtle vibe messages |

all mechanic standards followed. no issues found.
