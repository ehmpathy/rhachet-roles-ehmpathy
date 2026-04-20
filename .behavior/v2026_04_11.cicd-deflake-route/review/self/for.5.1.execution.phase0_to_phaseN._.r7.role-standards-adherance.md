# self-review: role-standards-adherance

## question

review for adherance to mechanic role standards. for each file changed, check:
- does the code follow mechanic standards correctly?
- are there violations of required patterns?
- did the junior introduce anti-patterns, bad practices, or deviations from our conventions?

## rule directories checked

| directory | relevance |
|-----------|-----------|
| code.prod/pitofsuccess.errors | failfast, failloud, forbid.failhide |
| code.prod/pitofsuccess.procedures | idempotent, semantic exit codes |
| code.prod/readable.comments | what-why headers |
| code.prod/readable.narrative | narrative flow, no else branches |
| code.test/frames.behavior | given-when-then |
| lang.terms | ubiqlang, treestruct, forbid.gerunds |
| lang.tones | seaturtle vibes, lowercase |

---

## review

### 1. cicd.deflake.sh (entry point)

**rule.require.what-why-headers:**
```bash
# .what = structured cicd deflake with route-based workflow
#
# .why  = transforms flake diagnosis from adhoc investigation into
#         structured workflows with evidence, diagnosis, repair,
#         verification, and institutional memory.
```
**verdict:** holds. has .what, .why, usage, guarantee sections.

---

**rule.require.failfast (pitofsuccess.errors):**
- line 64-69: unknown subcommand → `exit 2` with hint
- line 107-110: fallback unknown subcommand → `exit 2`
**verdict:** holds. constraint errors use exit 2.

---

**rule.require.exit-code-semantics:**
| exit | what it means | location |
|------|---------------|----------|
| 0 | help displayed | line 51 |
| 0 | no subcommand (shows usage) | line 94 |
| 2 | unknown subcommand | lines 69, 110 |
**verdict:** holds. exit 0 for success, exit 2 for constraint errors.

---

**rule.forbid.gerunds (lang.terms):**
scanned for -ing suffixes:
- "structured" = past participle, not gerund ✓
- no gerunds found
**verdict:** holds.

---

**set -euo pipefail:**
line 20: `set -euo pipefail`
**verdict:** holds.

---

### 2. cicd.deflake/init.sh

**rule.require.what-why-headers:**
```bash
# .what = init subcommand for cicd.deflake skill
#
# .why  = creates route with stones/guards for structured deflake workflow
```
**verdict:** holds. has .what, .why, prereqs, guarantee sections.

---

**rule.require.failfast:**
| check | location | exit code |
|-------|----------|-----------|
| not in git repo | lines 25-30 | exit 2 |
| already bound to cicd-deflake | lines 48-55 | exit 2 |
**verdict:** holds. all constraints use exit 2 with actionable hints.

---

**rule.forbid.gerunds:**
- "structured" = past participle ✓
- no gerunds found
**verdict:** holds.

---

**rule.require.treestruct-output (ergonomist):**
```bash
print_turtle_header "tubular!"              # 🐢 header
print_tree_start "cicd.deflake init"        # 🐚 shell root
print_tree_branch "route" "$ROUTE_PATH/ ✨"  # ├─ branch
print_tree_item "created"                    # ├─ item
echo "      ├─ 1.evidence.stone"            # file tree
print_coconut "hang ten!" "branch <-> route" # 🥥 footer
```
**verdict:** holds. follows turtle vibes treestruct pattern exactly.

---

### 3. cicd.deflake/detect.sh

**rule.require.what-why-headers:**
```bash
# .what = detect subcommand for cicd.deflake skill
#
# .why  = scans CI history to identify flaky tests:
#         - finds failed runs that passed on retry (flake signal)
#         - extracts test names and error patterns
#         - writes structured inventory for evidence stone
```
**verdict:** holds. has .what, .why (with bullet details), prereqs, guarantee.

---

**rule.require.failfast:**
| check | location | exit code |
|-------|----------|-----------|
| not in git repo | lines 74-77 | exit 2 |
| --into required | lines 80-85 | exit 2 |
| gh cli not installed | lines 88-93 | exit 2 |
| not authenticated | lines 96-101 | exit 2 |
| no route bound | lines 108-113 | exit 2 |
| --into not in route | lines 116-122 | exit 2 |
**verdict:** holds. all 6 constraint checks use exit 2 with hints.

---

**rule.require.exit-code-semantics:**
| exit | what it means | location |
|------|---------------|----------|
| 0 | help | line 66 |
| 0 | no flakes found | lines 162, 197 |
| 2 | not in git repo | line 76 |
| 2 | --into required | line 84 |
| 2 | gh not installed | line 92 |
| 2 | not authenticated | line 100 |
| 2 | no route bound | line 112 |
| 2 | --into not in route | line 121 |
**verdict:** holds. success = 0, constraint = 2.

---

**rule.forbid.failhide (pitofsuccess.errors):**
line 217-221:
```bash
LOGS=$(gh api ... 2>&1 || echo "")
if [[ -z "$LOGS" || "$LOGS" == "null" ]]; then
  continue
fi
```
**analysis:** `continue` skips this job if logs unavailable. this is not failhide because:
- we iterate over multiple jobs
- a single job with absent logs should not fail the entire scan
- the job is simply skipped, not silently accepted as passed

**verdict:** holds. skip within batch iteration is acceptable.

---

**rule.forbid.gerunds:**
- "scans" = verb ✓
- "flaky" = adjective ✓
- no gerunds found
**verdict:** holds.

---

### 4. cicd.deflake/output.sh

**rule.require.what-why-headers:**
```bash
# .what = turtle vibes output for cicd.deflake skill
#
# .why  = consistent, fun output format for deflake workflow
```
**verdict:** holds.

---

**rule.require.treestruct-output:**
functions provided:
- `print_turtle_header` → 🐢 + phrase
- `print_tree_start` → 🐚 + command
- `print_tree_branch` → ├─/└─ key: value
- `print_tree_leaf` → nested ├─/└─
- `print_tree_item` → ├─/└─ label
- `print_coconut` → 🥥 + message + dim bind info
- `print_error` → 🐢 bummer dude + └─ error:
- `print_flake_item` → ├─/└─ test (count) + └─ error:

**verdict:** holds. complete treestruct vocabulary.

---

### 5. cicd.deflake.integration.test.ts

**rule.require.given-when-then (code.test/frames.behavior):**
```typescript
given('[case1] init: creates route and binds', () => {
  when('[t0] init subcommand is invoked', () => {
    then('route directory is created with stones and guards', () => {
```
**verdict:** holds. uses test-fns given/when/then.

---

**rule.require.snapshots (code.test):**
line 132-136:
```typescript
const stdoutStable = result.stdout.replace(
  /v\d{4}_\d{2}_\d{2}\.cicd-deflake/g,
  'v$DATE.cicd-deflake',
);
expect(stdoutStable).toMatchSnapshot();
```
**verdict:** holds. snapshot with date mask for stability.

---

**rule.forbid.failhide (test):**
all 8 cases have explicit assertions:
- case1: `expect(result.status).toEqual(0)` + file existence checks
- case2: `expect(result.status).toEqual(0)` + snapshot
- case3: `expect(routesAfter.length).toEqual(routesBefore.length)`
- case4: `expect(result.status).toEqual(2)` + error message check
- case5: `expect(result.status).toEqual(0)` + content checks
- case6: `expect(result.status).toEqual(2)` + error checks
- case7: `expect(result.status).toEqual(0)` + content checks
- case8: `expect(result.status).toEqual(2)` + error check

**verdict:** holds. no silent pass-through, all paths verified.

---

**rule.forbid.remote-boundaries (unit tests):**
test file is `.integration.test.ts`, not `.test.ts`.
**verdict:** holds. integration tests can cross boundaries.

---

### 6. template files (stones + guards)

**rule.require.what-why-headers:**
each stone has explanatory header with .why and instructions.
**verdict:** holds.

---

**rule.forbid.gerunds:**
scanned all 15 template files:
- no -ing noun patterns found
- uses: "gather", "diagnose", "propose", "execute", "verify", "itemize", "emit"
**verdict:** holds. verbs, not gerunds.

---

## deviations found

none.

## conclusion

all cicd.deflake files adhere to mechanic role standards:

| standard | files checked | status |
|----------|---------------|--------|
| what-why headers | all 4 .sh files, 15 templates | ✓ |
| failfast with exit 2 | cicd.deflake.sh, init.sh, detect.sh | ✓ |
| exit code semantics | all .sh files | ✓ |
| forbid gerunds | all files | ✓ |
| treestruct output | output.sh, init.sh, detect.sh | ✓ |
| given-when-then | test file | ✓ |
| snapshots | test file | ✓ |
| forbid failhide | test file, detect.sh | ✓ |

no anti-patterns or deviations detected.
