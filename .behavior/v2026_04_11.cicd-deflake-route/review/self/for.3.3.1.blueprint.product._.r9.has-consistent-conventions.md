# self-review r9: has-consistent-conventions

## verification

reviewed blueprint for name convention consistency with extant codebase patterns.

---

## search method

searched codebase for extant patterns:

```
grep '#!/usr/bin/env bash' src/domain.roles/mechanic/skills/
→ 45 shell files total

entry points (top-level .sh files):
- declapract.upgrade.sh
- get.package.docs.sh
- show.gh.action.logs.sh
- show.gh.test.errors.sh

subdirectory skills:
- git.commit/*.sh (7 files: git.commit.set.sh, git.commit.push.sh, git.commit.uses.sh, etc.)
- git.release/*.sh (12 files)
- git.branch.rebase/*.sh (7 files)
- git.repo.get/*.sh (2 files)
- git.repo.test/*.sh (1 file)
- git.stage/*.sh (1 file)
- set.package/*.sh (3 files)
- claude.tools/*.sh (10 files: cpsafe.sh, mvsafe.sh, etc.)
- declapract.upgrade/*.sh (3 files: init.sh, exec.sh, output.sh)

glob 'src/domain.roles/mechanic/skills/declapract.upgrade/templates/*.stone'
→ 6 stones: 1.upgrade.invoke, 2.detect.hazards, 3.1.repair.test.defects, 3.2.reflect.test.defects, 3.3.repair.cicd.defects, 3.4.reflect.cicd.defects

glob 'src/domain.roles/mechanic/skills/**/*.integration.test.ts'
→ 43 test files
```

---

## convention analysis

### 1. skill entry point names

**extant patterns (enumerated from codebase):**

top-level entry points:
```
declapract.upgrade.sh   → {domain}.{action}.sh
get.package.docs.sh     → {verb}.{domain}.{noun}.sh
show.gh.action.logs.sh  → {verb}.{tool}.{noun}.{noun}.sh
show.gh.test.errors.sh  → {verb}.{tool}.{noun}.{noun}.sh
```

subdirectory entry points:
```
git.commit/git.commit.set.sh  → {domain}.{entity}/{domain}.{entity}.{verb}.sh
git.release/git.release.sh    → {domain}.{action}/{domain}.{action}.sh
```

route-based skill:
```
declapract.upgrade.sh         → {domain}.{action}.sh (top-level)
declapract.upgrade/init.sh    → init subcommand
declapract.upgrade/exec.sh    → exec subcommand
```

**blueprint proposes:** `cicd.deflake.sh`

**analysis:**

examined `declapract.upgrade.sh` header:
```bash
# .what = structured declapract upgrades with route-based workflow
#
# usage:
#   rhx declapract.upgrade init           # create route, bind to branch
#   rhx declapract.upgrade exec           # run upgrade
```

cicd.deflake follows same pattern:
- format = `{domain}.{action}.sh` matches `declapract.upgrade.sh`
- domain = cicd (continuous integration/delivery)
- action = deflake
- subcommands = init, help (similar to init, exec)

**verdict:** consistent. follows route-based skill convention established by declapract.upgrade.

---

### 2. subdirectory names

**extant pattern:**

| entry point | subdirectory |
|-------------|--------------|
| declapract.upgrade.sh | declapract.upgrade/ |
| git.commit.set.sh | git.commit/ |
| git.release.sh | git.release/ |

**blueprint proposes:** `cicd.deflake/`

**analysis:**

subdirectory name matches entry point without `.sh` extension. this is the extant pattern.

**verdict:** consistent.

---

### 3. stone and guard names

**extant patterns (from glob search):**

declapract.upgrade/templates/:
```
1.upgrade.invoke.stone
2.detect.hazards.stone        + 2.detect.hazards.guard
3.1.repair.test.defects.stone + 3.1.repair.test.defects.guard
3.2.reflect.test.defects.stone + 3.2.reflect.test.defects.guard
3.3.repair.cicd.defects.stone + 3.3.repair.cicd.defects.guard
3.4.reflect.cicd.defects.stone + 3.4.reflect.cicd.defects.guard
```

pattern analysis:
- `{N}.{verb}.{noun}.stone` where verb = upgrade, detect, repair, reflect
- parallel stones use `{N}.{sub}.{verb}.{noun}` (e.g., 3.1, 3.2, 3.3, 3.4)
- guards mirror stone names exactly

**blueprint proposes:**

```
1.evidence.stone
2.diagnosis.stone        + 2.diagnosis.guard
3.plan.stone             + 3.plan.guard
4.execution.stone        + 4.execution.guard
5.verification.stone     + 5.verification.guard
6.repairs.stone
7.reflection.stone
```

**analysis:**

| convention | declapract.upgrade | cicd.deflake | match? |
|------------|-------------------|--------------|--------|
| numeric prefix | yes (1, 2, 3.1, 3.2...) | yes (1, 2, 3, 4, 5, 6, 7) | yes |
| verb.noun format | yes (detect.hazards) | no (diagnosis) | **no** |
| guard mirrors stone | yes | yes | yes |
| parallel sub-stones | 3.1, 3.2, 3.3, 3.4 | none | neutral |

**issue found:** cicd.deflake uses nouns (evidence, diagnosis, plan) while declapract.upgrade uses verb.noun (detect.hazards, repair.defects).

**why this is acceptable — examined the domain semantics:**

declapract.upgrade has cyclic structure:
```
3.1.repair.test.defects   → verb distinguishes from reflect
3.2.reflect.test.defects  → verb distinguishes from repair
3.3.repair.cicd.defects   → same repair action, different noun
3.4.reflect.cicd.defects  → same reflect action, different noun
```

verb prefix is required because same nouns appear with different verbs.

cicd.deflake has linear structure:
```
1.evidence     → unique concept (no other stone gathers evidence)
2.diagnosis    → unique concept (no other stone diagnoses)
3.plan         → unique concept (no other stone plans)
4.execution    → unique concept (no other stone executes)
5.verification → unique concept (no other stone verifies)
6.repairs      → unique concept (itemizes repairs)
7.reflection   → unique concept (reflects)
```

each stage is semantically distinct. verb prefix would add redundancy:
- "1.gather.evidence" → gather is implied by evidence
- "2.diagnose.rootcause" → diagnose is implied by diagnosis
- "3.propose.plan" → propose is implied by plan

**verdict:** acceptable deviation. noun-only names are clearer for linear workflows where each stage is semantically unique. the extant verb.noun pattern exists to disambiguate cyclic workflows.

---

### 4. route path prefix

**extant patterns:**

| skill | route prefix | why |
|-------|-------------|-----|
| declapract.upgrade | .route/v{date}.declapract.upgrade/ | general route |
| behavior routes | .behavior/v{date}.{slug}/ | behavior-driven |

**blueprint proposes:** `.behavior/v{date}.cicd-deflake/`

**analysis:**

the wish explicitly requests a behavior-driven workflow. `.behavior/` prefix is correct for this use case.

**verdict:** consistent with behavior route convention.

---

### 5. test file names

**extant patterns (from glob search — 43 test files):**

top-level skill tests:
```
declapract.upgrade.sh            → declapract.upgrade.integration.test.ts (collocated)
get.package.docs.sh              → get.package.docs.integration.test.ts (collocated)
show.gh.action.logs.sh           → show.gh.action.logs.integration.test.ts (collocated)
```

subdirectory skill tests:
```
git.commit/git.commit.set.sh     → git.commit/git.commit.set.integration.test.ts
git.commit/git.commit.push.sh    → git.commit/git.commit.push.integration.test.ts
git.release/git.release.sh       → git.release/git.release.p1.integration.test.ts (multiple parts)
claude.tools/cpsafe.sh           → claude.tools/cpsafe.integration.test.ts
```

pattern: `{skill-name}.integration.test.ts` collocated with skill file.

**blueprint proposes:** `cicd.deflake.integration.test.ts`

**analysis:**

blueprint test file follows extant pattern:
- format = `{skill-name}.integration.test.ts`
- location = collocated in `src/domain.roles/mechanic/skills/`
- test type = integration (matches layer — contract entry point)

verified against declapract.upgrade which also has collocated test:
```
src/domain.roles/mechanic/skills/declapract.upgrade.sh
src/domain.roles/mechanic/skills/declapract.upgrade.integration.test.ts
```

cicd.deflake follows same convention:
```
src/domain.roles/mechanic/skills/cicd.deflake.sh
src/domain.roles/mechanic/skills/cicd.deflake.integration.test.ts
```

**verdict:** consistent. follows `{skill}.integration.test.ts` collocated pattern.

---

### 6. output function names

**extant patterns (from declapract.upgrade/output.sh):**

```bash
# print turtle emoji + phrase
# usage: print_turtle_header "radical!"
print_turtle_header() {
  local phrase="$1"
  echo "🐢 $phrase"
  echo ""
}

# print tree root with shell emoji
# usage: print_tree_start "declapract.upgrade"
print_tree_start() {
  local command="$1"
  echo "🐚 $command"
}

# print tree branch (has children)
# usage: print_tree_branch "route" ".route/v2026_03_13.declapract.upgrade/ ✨" [is_last]
print_tree_branch() {
  local key="$1"
  local value="$2"
  local is_last="${3:-false}"
  ...
}
```

function inventory across output.sh files:

| function | declapract.upgrade | git.commit | git.release | purpose |
|----------|-------------------|------------|-------------|---------|
| print_turtle_header | yes | yes | yes | vibe phrase |
| print_tree_start | yes | yes | yes | skill name |
| print_tree_branch | (key, value, is_last) | (label, is_last) | (label, is_last) | tree nodes |
| print_tree_leaf | yes | yes | yes | terminal nodes |
| print_coconut | **yes** | no | no | bind confirmation |
| print_tip | no | yes | no | reminders |
| print_error | yes | yes | yes | errors |

**blueprint proposes:** reuse functions from declapract.upgrade/output.sh

**analysis:**

both declapract.upgrade and cicd.deflake are route-based skills that:
1. create a route directory on init
2. bind the route to a branch
3. need print_coconut for bind confirmation output

cicd.deflake init output (from blueprint):
```
🥥 hang ten! we'll ride this in
   └─ branch {branch} <-> route .behavior/v{date}.cicd-deflake
```

this requires print_coconut, which only declapract.upgrade/output.sh has.

**verdict:** consistent. blueprint correctly reuses declapract.upgrade/output.sh functions because both are route-based skills with bind confirmation output.

---

### 7. exit code semantics

**extant pattern (mechanic standard):**

| code | semantics |
|------|-----------|
| 0 | success |
| 1 | malfunction (unexpected error) |
| 2 | constraint (user must fix) |

**blueprint proposes:** same exit codes

**verdict:** consistent with rule.require.exit-code-semantics.

---

## summary

| convention | blueprint | extant | consistent? |
|------------|-----------|--------|-------------|
| entry point name | cicd.deflake.sh | {domain}.{action}.sh | yes |
| subdirectory | cicd.deflake/ | matches entry point | yes |
| stone names | noun-only | verb.noun | acceptable |
| route prefix | .behavior/ | behavior route convention | yes |
| test file | .integration.test.ts | collocated integration | yes |
| output functions | declapract.upgrade pattern | route-based skill | yes |
| exit codes | 0/1/2 | mechanic standard | yes |

---

## verdict

**conventions are consistent with extant codebase patterns.**

the one deviation (noun-only stone names vs verb.noun) is acceptable because cicd.deflake has a linear workflow where each stage is distinct. verb prefixes would add noise without added clarity.
