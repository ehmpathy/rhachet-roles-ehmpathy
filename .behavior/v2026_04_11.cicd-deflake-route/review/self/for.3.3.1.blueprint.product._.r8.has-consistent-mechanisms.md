# self-review r8: has-consistent-mechanisms

## verification

reviewed blueprint mechanisms for consistency with extant codebase patterns. searched for duplicates that should be consolidated.

---

## search method

used grep and glob to find related codepaths:

```
grep 'declapract\.upgrade' src/domain.roles/mechanic/skills
→ 7 files: declapract.upgrade.sh, init.sh, exec.sh, output.sh, templates/, test

glob 'src/domain.roles/mechanic/skills/**/*.sh'
→ 50 shell files across skill directories
```

enumerated skill directories with entry points and output.sh:

```
src/domain.roles/mechanic/skills/
├── declapract.upgrade.sh          ← entry point
│   └── declapract.upgrade/
│       ├── init.sh                ← sourced by entry point
│       ├── exec.sh                ← sourced by entry point
│       ├── output.sh              ← shared functions
│       └── templates/             ← route templates
├── git.commit/
│   ├── git.commit.set.sh          ← standalone (no entry dispatcher)
│   └── output.sh                  ← shared functions
├── git.release/
│   ├── git.release.sh             ← entry point
│   └── output.sh                  ← shared functions
└── claude.tools/
    ├── cpsafe.sh                  ← standalone
    └── output.sh                  ← shared functions
```

---

## codebase pattern analysis

found two patterns in extant skills:

**pattern A: entry point with subcommand dispatch**

extant: `declapract.upgrade.sh`
```bash
# parse subcommand
case "$SUBCOMMAND" in
  init)
    source "$SKILL_DIR/declapract.upgrade/init.sh"
    ;;
  exec)
    source "$SKILL_DIR/declapract.upgrade/exec.sh"
    ;;
esac
```

**pattern B: skill with collocated output.sh**

extant: 5 skills have their own output.sh
```
declapract.upgrade/output.sh  ← print_turtle_header, print_coconut
git.commit/output.sh          ← print_turtle_header, print_tip
git.release/output.sh         ← print_turtle_header (different signature)
set.package/output.sh         ← print_turtle_header
claude.tools/output.sh        ← print_turtle_header, print_tree_file_line
```

each output.sh has similar base functions but different specialized functions. this is intentional: WET over DRY for 2-3 usages.

---

## blueprint mechanisms vs extant

the blueprint proposes:

| mechanism | extant pattern | reuses from |
|-----------|---------------|-------------|
| cicd.deflake.sh | pattern A (dispatch) | declapract.upgrade.sh |
| cicd.deflake/init.sh | init sourced by entry | declapract.upgrade/init.sh |
| cicd.deflake/output.sh | pattern B (collocated) | declapract.upgrade/output.sh |
| cicd.deflake/templates/ | templates copied on init | declapract.upgrade/templates/ |

---

## mechanism-by-mechanism analysis

### 1. cicd.deflake.sh (entry point)

**blueprint declares:** `[<-] REUSE: argument parse pattern from declapract.upgrade.sh`

**extant code (declapract.upgrade.sh lines 35-76):**
```bash
while [[ $# -gt 0 ]]; do
  case $1 in
    --skill|--repo|--role)
      shift 2
      ;;
    --help|-h)
      # show help and exit
      ;;
    init|exec)
      SUBCOMMAND="$1"
      shift
      ;;
    *)
      # handle unknown or passthrough
      ;;
  esac
done
```

**duplicate check:**

| element | shared utility extant? | duplicate risk? |
|---------|----------------------|-----------------|
| rhachet arg skip | no | no — boilerplate, not utility |
| subcommand dispatch | no | no — skill-specific commands |
| --help output | no | no — skill-specific help text |

**why no shared utility?**

to extract a common entry point would require:
```bash
# hypothetical shared utility (does not exist)
source "$SHARED/entry-point-parser.sh" \
  --subcommands "init,help" \
  --help-text "usage: rhx cicd.deflake <subcommand>"
```

this adds indirection for ~30 lines of boilerplate. the codebase has no such utility because:
1. subcommands differ per skill (init/exec vs init/help)
2. help text differs per skill
3. error messages differ per skill

rule.prefer.wet-over-dry: don't abstract until 3+ usages with stable pattern.

**verdict:** pattern reuse (copy + adapt) is correct. matches codebase convention.

---

### 2. cicd.deflake/init.sh (route creation)

**blueprint declares:** `[<-] REUSE: init pattern from declapract.upgrade/init.sh`

**extant code (declapract.upgrade/init.sh lines 42-59):**
```bash
# compute route metadata
ISO_DATE=$(date +%Y_%m_%d)
ROUTE_SLUG="v${ISO_DATE}.declapract.upgrade"
ROUTE_PATH=".route/${ROUTE_SLUG}"

# instantiate route
mkdir -p "$ROUTE_PATH"

# copy only .stone and .guard files
for file in "$TEMPLATES_DIR"/*.stone "$TEMPLATES_DIR"/*.guard; do
  if [[ -f "$file" ]]; then
    cp -f "$file" "$ROUTE_PATH/"
  fi
done

# bind route to branch
npx rhachet run --repo bhrain --skill route.bind.set --route "$ROUTE_PATH"
```

**duplicate check:**

| element | shared utility extant? | why not? |
|---------|----------------------|----------|
| ISO_DATE computation | no | 1-line bash |
| route path format | no | differs per skill (.route/ vs .behavior/) |
| template copy loop | no | trivial (5 lines) |
| route bind call | yes (rhx route.bind.set) | reused correctly |

**key difference: route prefix**

declapract.upgrade uses `.route/v{date}.declapract.upgrade/`
cicd.deflake uses `.behavior/v{date}.cicd-deflake/`

the wish explicitly requests `.behavior/` prefix for behavior-driven workflow. this is a domain requirement, not arbitrary divergence.

**why no shared utility?**

a hypothetical `genRouteFromTemplates` could exist:
```bash
# hypothetical (does not exist)
genRouteFromTemplates \
  --prefix ".behavior" \
  --slug "cicd-deflake" \
  --templates "$SKILL_DIR/templates"
```

this does not exist because:
1. only 2 route-based skills (declapract.upgrade, cicd.deflake)
2. rule.prefer.wet-over-dry: wait for 3+ usages
3. prerequisite checks differ (declapract.use.yml vs git repo context)
4. output messages differ (skill-specific vibes)

**verdict:** pattern reuse is correct. no premature abstraction.

---

### 3. cicd.deflake/output.sh (turtle vibes)

**blueprint declares:** `[<-] REUSE: output functions from declapract.upgrade/output.sh`

**extant code comparison:**

```bash
# declapract.upgrade/output.sh
print_tree_branch() {
  local key="$1"
  local value="$2"
  local is_last="${3:-false}"
  # ...
}

# git.commit/output.sh (different signature!)
print_tree_branch() {
  local label="$1"
  local is_last="${2:-false}"
  # ...
}
```

same function name, different contracts. this is why a shared utility does not exist.

**function inventory across output.sh files:**

| function | declapract.upgrade | git.commit | claude.tools |
|----------|-------------------|------------|--------------|
| print_turtle_header | yes | yes | yes |
| print_tree_start | yes | yes | yes |
| print_tree_branch | (key, value, is_last) | (label, is_last) | (key, value) |
| print_tree_leaf | yes | yes | yes |
| print_coconut | yes | no | no |
| print_tip | no | yes | no |
| print_tree_file_line | no | no | yes |

**why no shared utility?**

1. **signature divergence**: same name, different parameter lists
2. **specialized functions**: print_coconut for routes, print_tip for commit, print_tree_file_line for file ops
3. **isolation**: each skill directory is self-contained; cross-skill sourcing creates coupling

the codebase pattern is intentional WET:
- copy base functions
- adapt for skill-specific needs
- add specialized functions as needed

rule.prefer.wet-over-dry applies: 5 skills with output.sh, but signatures differ. abstraction would require either:
- parameter bags (complexity)
- function overloading (bash doesn't support)
- separate functions per skill (defeats purpose)

**verdict:** pattern reuse (copy + adapt) is correct. matches codebase convention.

---

### 4. templates/ (stones + guards)

**blueprint declares:** 7 stones + 4 guards in templates/

**extant vs proposed templates:**

| declapract.upgrade/templates/ | cicd.deflake/templates/ |
|------------------------------|-------------------------|
| 1.upgrade.invoke.stone | 1.evidence.stone |
| 2.detect.hazards.stone/guard | 2.diagnosis.stone/guard |
| 3.1.repair.test.defects.stone/guard | 3.plan.stone/guard |
| 3.2.reflect.test.defects.stone/guard | 4.execution.stone/guard |
| 3.3.repair.cicd.defects.stone/guard | 5.verification.stone/guard |
| 3.4.reflect.cicd.defects.stone/guard | 6.repairs.stone |
| | 7.reflection.stone |

**duplicate check:**

zero content overlap:
- "detect declapract hazards" ≠ "gather flake evidence"
- "repair test defects" ≠ "diagnose flake root cause"
- "reflect on defects" ≠ "verify 3x pass"

the workflow stages are fundamentally different. each template encodes domain-specific instructions for its route.

**could we share template components?**

examined potential shared elements:

| element | sharable? | why not? |
|---------|-----------|----------|
| stone header format | structure, not content | .stone format is route driver convention |
| guard yaml format | structure, not content | .guard format is route driver convention |
| peer-review pattern | maybe | but each guard has skill-specific rules |

the peer-review guard pattern (4.execution.guard) references skill-specific rules:
```yaml
reviews:
  peer:
    - npx rhachet run --repo bhrain --skill review --rules '...' --paths '...'
```

the rules and paths differ per workflow. no template content is sharable.

**verdict:** no duplicate. templates are domain-specific by design.

---

## summary

| mechanism | extant pattern | approach | consistent? |
|-----------|---------------|----------|-------------|
| cicd.deflake.sh | declapract.upgrade.sh | copy + adapt | yes |
| cicd.deflake/init.sh | declapract.upgrade/init.sh | copy + adapt | yes |
| cicd.deflake/output.sh | 5 skill-specific output.sh | copy + adapt (WET) | yes |
| templates/*.stone | domain-specific | no overlap | yes |
| templates/*.guard | domain-specific | no overlap | yes |

---

## potential shared utilities: evaluated and rejected

| hypothetical utility | why not extracted |
|---------------------|-------------------|
| entry-point-parser.sh | subcommands differ per skill |
| genRouteFromTemplates | only 2 route skills, prerequisites differ |
| shared output.sh | function signatures differ across skills |

rule.prefer.wet-over-dry: the codebase intentionally avoids premature abstraction. with only 2 route-based skills (declapract.upgrade, cicd.deflake), extraction would be premature.

---

## issue found: none

the blueprint mechanisms are consistent with extant codebase patterns:

1. **entry point**: follows declapract.upgrade.sh dispatch pattern
2. **init**: follows declapract.upgrade/init.sh route creation pattern
3. **output**: follows per-skill output.sh convention (intentional WET)
4. **templates**: domain-specific, zero content overlap with extant templates

no mechanism duplicates extant functionality without the blueprint's documented REUSE annotation.

---

## verdict

**mechanisms are consistent with codebase patterns.**

the blueprint correctly uses pattern reuse (copy + adapt) rather than abstraction, which aligns with rule.prefer.wet-over-dry and matches how extant skills are structured.
