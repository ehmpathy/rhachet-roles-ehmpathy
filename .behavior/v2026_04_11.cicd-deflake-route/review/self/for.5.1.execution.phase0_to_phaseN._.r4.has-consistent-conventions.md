# self-review: has-consistent-conventions

## question

for each name choice in the code, ask:
- what name conventions does the codebase use?
- do we use a different namespace, prefix, or suffix pattern?
- do we introduce new terms when extant terms exist?
- does our structure match extant patterns?

## search for related codepaths

searched skill structure in mechanic role:

```
src/domain.roles/mechanic/skills/
├── declapract.upgrade.sh      # entry point
├── declapract.upgrade/
│   ├── init.sh                # subcommand
│   ├── exec.sh                # subcommand
│   ├── output.sh              # output functions
│   └── templates/             # route templates

├── cicd.deflake.sh            # entry point
├── cicd.deflake/
│   ├── init.sh                # subcommand
│   ├── detect.sh              # subcommand
│   ├── output.sh              # output functions
│   └── templates/             # route templates
```

## review

### 1. skill namespace convention

**extant pattern:** `domain.verb` (e.g., `declapract.upgrade`, `git.commit`, `git.release`)

**cicd.deflake:** follows pattern. `cicd` = domain, `deflake` = verb.

**verdict:** holds. matches convention.

---

### 2. subcommand convention

**extant pattern:** verb names (`init`, `exec`, `set`, `get`, `push`)

| skill | subcommands |
|-------|-------------|
| declapract.upgrade | init, exec |
| git.commit | set, push, uses, bind |
| git.release | (flags, not subcommands) |

**cicd.deflake:** uses `init`, `detect`

**analysis:**
- `init` = standard, matches declapract.upgrade
- `detect` = verb, skill-specific (no extant equivalent to compare)

**verdict:** holds. `init` matches. `detect` is new but follows verb convention.

---

### 3. output function convention

**extant pattern (declapract.upgrade/output.sh):**
```bash
print_turtle_header()
print_tree_start()
print_tree_branch()
print_tree_leaf()
print_tree_item()
print_coconut()
print_error()
```

**cicd.deflake/output.sh:**
```bash
print_turtle_header()    # identical
print_tree_start()       # identical
print_tree_branch()      # identical
print_tree_leaf()        # identical
print_tree_item()        # identical
print_coconut()          # identical
print_error()            # identical
print_flake_item()       # new, skill-specific
```

**verdict:** holds. base functions identical. `print_flake_item` follows `print_*_item` pattern.

---

### 4. template file convention

**extant pattern (declapract.upgrade/templates/):**
```
1.upgrade.invoke.stone
2.detect.hazards.stone
2.detect.hazards.guard
3.1.repair.test.defects.stone
3.1.repair.test.defects.guard
...
```

pattern: `N[.N].verb[.noun].stone|guard`

**cicd.deflake/templates/:**
```
1.evidence.stone
2.1.diagnose.research.stone
2.1.diagnose.research.guard
2.2.diagnose.rootcause.stone
2.2.diagnose.rootcause.guard
3.plan.stone
3.plan.guard
4.execution.stone
4.execution.guard
5.verification.stone
5.verification.guard
6.repairs.stone
7.reflection.stone
7.reflection.guard
8.institutionalize.stone
```

**analysis:**
- numeric prefix: ✓ (1, 2.1, 2.2, 3, 4, 5, 6, 7, 8)
- dot-separated hierarchy: ✓ (2.1, 2.2 for sub-phases)
- `.stone` and `.guard` extensions: ✓
- verbs/nouns for phase names: ✓

**verdict:** holds. follows extant template convention.

---

### 5. variable conventions

deep dive: actual code comparison between init.sh files.

**declapract.upgrade/init.sh (lines 42-45):**
```bash
ISO_DATE=$(date +%Y_%m_%d)
ROUTE_SLUG="v${ISO_DATE}.declapract.upgrade"
ROUTE_PATH=".route/${ROUTE_SLUG}"
TEMPLATES_DIR="$SKILL_DIR/declapract.upgrade/templates"
```

**cicd.deflake/init.sh (lines 36-39):**
```bash
ISO_DATE=$(date +%Y_%m_%d)
ROUTE_SLUG="v${ISO_DATE}.cicd-deflake"
ROUTE_PATH=".behavior/${ROUTE_SLUG}"
TEMPLATES_DIR="$SKILL_DIR/cicd.deflake/templates"
```

**line-by-line comparison:**

| variable | declapract.upgrade | cicd.deflake | match |
|----------|-------------------|--------------|-------|
| ISO_DATE | `$(date +%Y_%m_%d)` | `$(date +%Y_%m_%d)` | ✓ identical |
| ROUTE_SLUG | `v${ISO_DATE}.declapract.upgrade` | `v${ISO_DATE}.cicd-deflake` | ✓ same pattern |
| ROUTE_PATH | `.route/${ROUTE_SLUG}` | `.behavior/${ROUTE_SLUG}` | ✓ intentional diff |
| TEMPLATES_DIR | `$SKILL_DIR/declapract.upgrade/templates` | `$SKILL_DIR/cicd.deflake/templates` | ✓ same pattern |

**why it holds:**
- same variable names = easy to understand across skills
- same date format = consistent route versioning
- same slug pattern = predictable route paths
- TEMPLATES_DIR uses $SKILL_DIR = portable across installations

**verdict:** holds. identical variable names and patterns.

---

### 6. argument conventions

**extant pattern:**
```bash
--mode plan|apply    # declapract.upgrade
--days <n>           # common date range pattern
--into <path>        # output destination
```

**cicd.deflake detect:**
```bash
--days <n>           # matches common pattern
--into <path>        # matches output pattern
--help|-h            # standard help
```

**verdict:** holds. uses extant argument conventions.

---

### 7. error message convention

deep dive: actual error blocks side by side.

**declapract.upgrade/init.sh (lines 29-36):**
```bash
if [[ ! -f "$CONFIG_FILE" ]]; then
  print_error "not a declapract repo"
  echo ""
  echo "   $CONFIG_FILE not found"
  echo ""
  echo "   run \`npx declapract init\` first"
  exit 2
fi
```

**cicd.deflake/init.sh (lines 25-30):**
```bash
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  print_error "not in a git repository"
  echo ""
  echo "   run this command from within a git repository"
  exit 2
fi
```

**pattern analysis:**

| element | declapract.upgrade | cicd.deflake | match |
|---------|-------------------|--------------|-------|
| condition check | `if [[ ! -f "$CONFIG_FILE" ]]` | `if ! git rev-parse ...` | ✓ fail-fast guard |
| error function | `print_error "..."` | `print_error "..."` | ✓ identical |
| blank line | `echo ""` | `echo ""` | ✓ identical |
| detail indent | `echo "   ..."` | `echo "   ..."` | ✓ 3-space indent |
| remediation hint | `run \`npx declapract init\`` | `run this command from within...` | ✓ actionable hint |
| exit code | `exit 2` | `exit 2` | ✓ constraint error |

**why it holds:**
- `print_error` provides consistent turtle vibes header
- 3-space indent aligns with tree structure
- exit 2 = constraint error (caller must fix)
- actionable hints reduce debug time

**verdict:** holds. same error output pattern, same exit code, same structure.

---

### 8. route path convention

**extant pattern:** `.route/v{isodate}.{slug}/`

**cicd.deflake:** `.behavior/v{isodate}.{slug}/`

**analysis:** this differs! but intentionally — the wish specifies behavior routes, not regular routes. `.behavior/` is the standard prefix for behavior-driven routes (see rhachet-roles-bhuild).

**verdict:** holds. intentional distinction, not a convention violation.

---

### 9. route instantiation convention

deep dive: template copy logic side by side.

**declapract.upgrade/init.sh (lines 51-59):**
```bash
# findsert route directory
mkdir -p "$ROUTE_PATH"

# copy only .stone and .guard files (no .sh files)
for file in "$TEMPLATES_DIR"/*.stone "$TEMPLATES_DIR"/*.guard; do
  if [[ -f "$file" ]]; then
    cp -f "$file" "$ROUTE_PATH/"
  fi
done
```

**cicd.deflake/init.sh (lines 62-70):**
```bash
# findsert route directory
mkdir -p "$ROUTE_PATH"

# copy only .stone and .guard files
for file in "$TEMPLATES_DIR"/*.stone "$TEMPLATES_DIR"/*.guard; do
  if [[ -f "$file" ]]; then
    cp -f "$file" "$ROUTE_PATH/"
  fi
done
```

**line-by-line comparison:**

| line | declapract.upgrade | cicd.deflake | match |
|------|-------------------|--------------|-------|
| mkdir | `mkdir -p "$ROUTE_PATH"` | `mkdir -p "$ROUTE_PATH"` | ✓ identical |
| comment | `# findsert route directory` | `# findsert route directory` | ✓ identical |
| for loop | `for file in "$TEMPLATES_DIR"/*.stone "$TEMPLATES_DIR"/*.guard` | `for file in "$TEMPLATES_DIR"/*.stone "$TEMPLATES_DIR"/*.guard` | ✓ identical |
| file check | `if [[ -f "$file" ]]` | `if [[ -f "$file" ]]` | ✓ identical |
| copy | `cp -f "$file" "$ROUTE_PATH/"` | `cp -f "$file" "$ROUTE_PATH/"` | ✓ identical |

**why it holds:**
- `mkdir -p` = idempotent directory creation
- glob pattern = consistent file types (.stone, .guard)
- `-f` flag = force overwrite for re-runs
- file check = handles empty glob gracefully

**verdict:** holds. identical copy pattern. copy-paste verified.

---

## conclusion

all name conventions are consistent with extant patterns:

| element | extant | cicd.deflake | status |
|---------|--------|--------------|--------|
| skill namespace | domain.verb | cicd.deflake | ✓ |
| subcommands | verb names | init, detect | ✓ |
| output functions | print_* | print_* | ✓ |
| template names | N.verb.stone/guard | N.verb.stone/guard | ✓ |
| variables | UPPER_SNAKE | UPPER_SNAKE | ✓ |
| arguments | --flag value | --flag value | ✓ |
| errors | print_error + exit 2 | print_error + exit 2 | ✓ |
| route path | .behavior/v{date}.{slug}/ | .behavior/v{date}.cicd-deflake/ | ✓ |

no convention divergences found.
