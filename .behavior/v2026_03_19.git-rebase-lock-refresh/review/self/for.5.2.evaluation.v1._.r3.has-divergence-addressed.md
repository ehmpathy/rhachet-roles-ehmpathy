# self-review: has-divergence-addressed

## review scope

verify each divergence was properly addressed: either repaired or backed up with strong rationale.

---

## methodology

for each divergence:
1. read the actual source file to verify the claim
2. extract the exact code that implements the divergent behavior
3. compare to what the blueprint specified
4. evaluate the backup rationale against skeptic challenges
5. determine if the backup is justified or if repair is needed

files read:
- git.branch.rebase.lock.sh (lines 115-179, 195-209)
- git.branch.rebase.take.sh (lines 250-258)
- 3.3.1.blueprint.product.v1.i1.md (operations decomposition section)

---

## divergences enumerated

from the has-divergence-analysis review:

| # | divergence | status |
|---|------------|--------|
| 1 | operations inlined vs functions | backed up (YAGNI) |
| 2 | output format nested vs flat | backed up (format choice) |

---

## divergence 1: operations inlined vs functions

### what blueprint says

```
### new operations (in git.branch.rebase.lock.sh)
- `detect_lock_file()` — returns lock file path or empty
- `detect_package_manager()` — returns pnpm|npm|yarn
- `is_pm_installed()` — check if pm binary available
- `run_install()` — execute pm install
```

### what implementation has

verified via direct read of git.branch.rebase.lock.sh:

**lock file detection (lines 118-131):**
```bash
######################################################################
# detect lock file
######################################################################
LOCK_FILE=""
PM=""

# priority: pnpm > npm > yarn
if [[ -f "pnpm-lock.yaml" ]]; then
  LOCK_FILE="pnpm-lock.yaml"
  PM="pnpm"
elif [[ -f "package-lock.json" ]]; then
  LOCK_FILE="package-lock.json"
  PM="npm"
elif [[ -f "yarn.lock" ]]; then
  LOCK_FILE="yarn.lock"
  PM="yarn"
fi
```

**package manager check (lines 146-160):**
```bash
if [[ "$PM" == "pnpm" ]]; then
  if ! command -v pnpm &>/dev/null; then
    # error: pnpm not found
  fi
elif [[ "$PM" == "yarn" ]]; then
  if ! command -v yarn &>/dev/null; then
    # error: yarn not found
  fi
fi
# npm is always available (comes with node)
```

**run install (lines 169-179):**
```bash
case "$PM" in
  pnpm)
    INSTALL_OUTPUT=$(pnpm install 2>&1) || INSTALL_EXIT=$?
    ;;
  npm)
    INSTALL_OUTPUT=$(npm install 2>&1) || INSTALL_EXIT=$?
    ;;
  yarn)
    INSTALL_OUTPUT=$(yarn install 2>&1) || INSTALL_EXIT=$?
    ;;
esac
```

this matches the blueprint's functional requirements, but inline vs functions.

### was it repaired?

no — the divergence was backed up, not repaired.

### is the backup rationale strong?

the rationale invokes YAGNI, with 4 support points:

1. **each operation is used once**
   - verified: `detect_lock_file` logic appears only at lines 118-131
   - verified: `is_pm_installed` logic appears only at lines 147, 154
   - verified: `run_install` logic appears only at lines 169-179
   - no other file uses these operations

2. **lock.sh is the only consumer**
   - verified: no other file sources lock.sh or its operations
   - operations.sh (shared) does not include these

3. **code is readable with section headers**
   - verified: section header at line 115-117 `# detect lock file`
   - verified: section header at line 141-143 `# detect package manager availability`
   - verified: section header at line 163-165 `# run install`

4. **blueprint itself establishes YAGNI for this file**
   - blueprint says: "inline output functions in lock.sh (follows YAGNI — single consumer)"
   - same principle applies to operations

### would a skeptic accept it?

**skeptic challenge:** "functions are cleaner and more testable"

**counter:**
- shell functions add overhead for single-use code
- the code is already organized with section headers
- unit tests are not the pattern here (integration tests cover the skill)
- blueprint explicitly endorses inline code for single-consumer cases

**skeptic challenge:** "what if we need to reuse these operations later?"

**counter:**
- YAGNI: do not abstract until needed
- when a second consumer appears, extract then
- current design does not prevent future extraction

**verdict:** backup accepted. the rationale is strong and the divergence is justified.

---

## divergence 2: output format nested vs flat

### what blueprint says

```
   ├─ staged: {lockfile} ✓
```

### what implementation has

verified via direct read of git.branch.rebase.lock.sh (lines 202-208):
```bash
print_turtle_header "shell yeah!"
print_tree_start "git.branch.rebase lock refresh"
print_tree_branch "detected" "$PM"
print_tree_branch "run" "$PM install"
echo "   ├─ staged"
print_tree_nested "$LOCK_FILE"
print_tree_leaf "done"
```

the output structure is:
```
   ├─ staged
   │  └─ pnpm-lock.yaml ✓
```

this differs from blueprint's flat format: `├─ staged: {lockfile} ✓`

### was it repaired?

no — the divergence was backed up, not repaired.

### is the backup rationale strong?

the rationale invokes "valid format choice" with 3 support points:

1. **nested format mirrors take.sh suggestion output**
   - verified via direct read of git.branch.rebase.take.sh (lines 254-258):
     ```bash
     if [[ "$LOCK_FILE_SETTLED" == "true" ]]; then
       echo "   ├─ lock taken, refresh it with: ⚡"
       echo "   │  └─ rhx git.branch.rebase lock refresh"
     fi
     ```
   - both use the nested tree pattern with `│  └─`
   - consistency between lock.sh and take.sh output

2. **nested format is more extensible**
   - could show multiple lock files if needed
   - structured for future multi-file support

3. **both formats convey the same information**
   - flat: `staged: pnpm-lock.yaml ✓`
   - nested: `staged` + `└─ pnpm-lock.yaml ✓`
   - user learns the same fact either way

### would a skeptic accept it?

**skeptic challenge:** "the blueprint is the spec, just follow it"

**counter:**
- blueprint is a sketch, not a pixel-perfect spec
- the intent (show what was staged) is fulfilled
- the nested format is arguably better (consistent with take.sh)

**skeptic challenge:** "this is scope creep from the blueprint"

**counter:**
- no new functionality was added
- the information shown is identical
- only presentation differs

**verdict:** backup accepted. the format choice is reasonable and does not violate the blueprint's intent.

---

---

## deep skeptic check

### question: is the YAGNI backup just laziness?

**test:** would a function extraction provide clear value?

```bash
# hypothetical function extraction
detect_lock_file() {
  if [[ -f "pnpm-lock.yaml" ]]; then echo "pnpm-lock.yaml"; return 0; fi
  if [[ -f "package-lock.json" ]]; then echo "package-lock.json"; return 0; fi
  if [[ -f "yarn.lock" ]]; then echo "yarn.lock"; return 0; fi
  return 1
}

# then at call site
LOCK_FILE=$(detect_lock_file) || { error "no lock file"; exit 1; }
```

**analysis:**
- adds 7 lines of function definition
- saves 0 lines at call site (still need variable assignment)
- no reuse (function called once)
- adds indirection for reader to follow

**verdict:** function extraction would add code without benefit. the backup is not laziness.

### question: could the nested format cause confusion?

**test:** compare user perception of both formats

blueprint format:
```
   ├─ staged: pnpm-lock.yaml ✓
```

actual format:
```
   ├─ staged
   │  └─ pnpm-lock.yaml ✓
```

**analysis:**
- both show the same information: lock file was staged
- nested format is more consistent with the tree structure
- nested format allows future expansion (multiple files)
- user sees the same actionable information

**verdict:** nested format is a valid design choice, not an error.

---

## conclusion

| divergence | addressed how | verdict |
|------------|---------------|---------|
| operations inlined | backed up (YAGNI) | accepted |
| output format nested | backed up (format choice) | accepted |

both divergences were addressed with strong rationale. neither is laziness or avoidance of work:

- operations inlined: follows explicit YAGNI guidance in blueprint
- output format nested: consistent with take.sh and more extensible

no divergences require repair. the evaluation document correctly identifies and justifies both.

