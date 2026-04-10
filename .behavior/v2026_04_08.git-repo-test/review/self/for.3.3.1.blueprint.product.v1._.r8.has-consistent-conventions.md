# self-review: has-consistent-conventions

review for divergence from extant names and patterns.

---

## research: extant conventions

### skill folder structure

searched `src/domain.roles/mechanic/skills/`:

| folder | pattern |
|--------|---------|
| claude.tools/ | shared utilities |
| git.branch.rebase/ | git domain |
| git.commit/ | git domain |
| git.release/ | git domain |
| git.repo.get/ | git domain |
| git.repo.test/ | git domain |
| git.stage/ | git domain |
| set.package/ | set domain |

**convention**: `<domain>.<action>/` or `<verb>.<noun>/`

**blueprint**: extends `git.repo.test/` — consistent.

---

### test file names

searched `src/domain.roles/mechanic/skills/git.*/`:

| skill | test file pattern |
|-------|-------------------|
| git.release | `git.release.p1.integration.test.ts`, `git.release.p3.scenes.on_feat.into_main.integration.test.ts` |
| git.repo.test | `git.repo.test.integration.test.ts` |
| git.commit | subskill tests in folder |

**convention**:
- single test file: `<skill>.integration.test.ts`
- multiple test files: `<skill>.<suffix>.integration.test.ts`
- git.release uses `.p1`, `.p2`, `.p3.scenes.<scenario>` pattern

**blueprint**: `git.repo.test.play.integration.test.ts`

**analysis**: `.play` is a new suffix convention. extant uses `.p1`/`.p2` (priority/phase) or `.scenes` (scenarios). however:
- the extant `git.repo.test.integration.test.ts` covers lint functionality (cases 1-9)
- `.play` suggests playtest/journey tests for new functionality
- this is additive, not divergent — extant file retained

**why `.play` rather than `.p2` or extend extant file?**

1. **not `.p2`**: git.release uses `.p1`/`.p2` for priority phases of the same feature set. the new unit/integration/acceptance tests are a *different* feature set from lint — not a "phase 2" of lint.

2. **not extend extant**: the extant file has 9 cases for lint. the new tests add 9+ cases for unit/integration/acceptance. combined file would be 600+ lines. separation keeps each file focused.

3. **why `.play`**: the behavior route has a `playtest` stone (5.5.playtest). `.play` signals these are journey tests that exercise the full skill through real scenarios. this naming aligns with the route workflow.

**verdict**: acceptable. `.play` distinguishes journey tests from extant lint tests. follows `<skill>.<suffix>.integration.test.ts` pattern and aligns with route's playtest concept.

---

### brief names

searched `src/domain.roles/mechanic/briefs/practices/code.test/lessons.howto/`:

| brief | pattern |
|-------|---------|
| howto.run.[lesson].md | howto.<topic>.[lesson].md |
| howto.write.[lesson].md | howto.<topic>.[lesson].md |
| howto.diagnose.[lesson].md | howto.<topic>.[lesson].md |
| howto.use.[lesson].md | howto.<topic>.[lesson].md |

**convention**: `howto.<topic>.[lesson].md`

**blueprint**: `howto.run-tests.[lesson].md`

**analysis**: follows convention with `run-tests` as topic. hyphenated topics are used elsewhere (e.g., `howto.mock-cli-via-path.[lesson].md`).

**verdict**: consistent.

---

### flag names

searched git.repo.test.sh extant flags:

| flag | semantics |
|------|-----------|
| `--what` | test type (extant: lint only) |
| `--when` | context hint (extant: unused by skill) |

**blueprint adds**:
- `--scope` — filter pattern
- `--resnap` — update snapshots
- `--` — passthrough to npm

**why these names hold**:

1. **`--scope` not `--filter` or `--pattern`**: scope implies "reduce the set" which is exactly what `--testPathPattern` does. filter is overloaded (could mean include or exclude). pattern is too generic. scope is precise.

2. **`--resnap` not `--update-snapshots` or `-u`**: resnap matches the `RESNAP=true` env var convention used across ehmpathy repos. this creates a 1:1 mental model: `--resnap` → `RESNAP=true`. `-u` is jest's flag, not ours.

3. **`--` passthrough**: standard bash/npm separator. no alternative considered — this is universal.

**verdict**: consistent. flag names align with domain conventions (RESNAP) and semantic clarity (scope).

---

### log directory names

extant in git.repo.test.sh:

```bash
LOG_DIR=".log/role=mechanic/skill=git.repo.test"
```

**blueprint**: reuses extant pattern.

**verdict**: consistent.

---

### exit code semantics

extant in ehmpathy skills:

| code | result |
|------|--------|
| 0 | success |
| 1 | malfunction (npm failed, keyrack failed) |
| 2 | constraint (tests failed, user must fix) |

**blueprint**: uses same semantics.

**why this holds**:

the 0/1/2 distinction enables callers to respond appropriately:
- 0: continue workflow
- 1: retry or escalate (transient failure)
- 2: stop and fix (user action required)

for test failures, exit 2 is correct because:
- tests failed = user must fix code
- this is a constraint error, not a malfunction
- the skill worked correctly; the code under test is broken

the extant git.repo.test.sh uses this exact pattern for lint failures. extending to unit/integration/acceptance maintains consistency.

**verdict**: consistent. exit codes follow ehmpathy semantic conventions.

---

### keyrack command pattern

extant in howto.keyrack.[lesson].md:

```bash
rhx keyrack unlock --owner ehmpath --env test
```

**blueprint**: uses same command.

**verdict**: consistent.

---

### output function names

extant in claude.tools/output.sh:

| function | purpose |
|----------|---------|
| print_turtle_header | 🐢 header |
| print_tree_start | 🐚 root |
| print_tree_branch | ├─ branch |
| print_tree_leaf | └─ leaf |
| print_tree_file_line | nested file |

**blueprint**: reuses extant functions.

**verdict**: consistent.

---

## summary

| convention | extant | blueprint | verdict |
|------------|--------|-----------|---------|
| skill folder | git.repo.test/ | extends extant | consistent |
| test file | `<skill>.<suffix>.integration.test.ts` | git.repo.test.play.integration.test.ts | consistent |
| brief file | `howto.<topic>.[lesson].md` | howto.run-tests.[lesson].md | consistent |
| flags | --what | --what, --scope, --resnap, -- | consistent |
| log dir | `.log/role=mechanic/skill=git.repo.test` | reuses extant | consistent |
| exit codes | 0/1/2 | 0/1/2 | consistent |
| keyrack cmd | rhx keyrack unlock --owner ehmpath --env test | same | consistent |
| output funcs | print_turtle_header, etc. | reuses extant | consistent |

---

## conclusion

**no convention issues found.**

### why each convention holds

| convention | why it holds |
|------------|--------------|
| skill folder `git.repo.test/` | extends extant; no reason to rename |
| test file `.play` suffix | aligns with route's playtest concept; separates from extant lint tests |
| brief `howto.run-tests.[lesson].md` | follows extant `howto.<topic>.[lesson].md` pattern |
| flag `--scope` | precise semantic (reduce set); avoids overloaded terms |
| flag `--resnap` | 1:1 match to `RESNAP=true` env var |
| exit codes 0/1/2 | caller can distinguish "continue" vs "retry" vs "fix" |
| keyrack command | documented pattern from howto.keyrack.[lesson].md |
| output functions | reuse avoids duplication; maintains visual consistency |

### no new terms introduced

the blueprint does not introduce new domain terms:
- "scope" = standard filter concept
- "resnap" = extant RESNAP convention
- "stats" = standard test output summary

all output format uses extant turtle vibes vocabulary:
- 🐢 cowabunga/bummer dude
- 🐚 skill root
- ├─ └─ tree structure

### structure matches extant

the codepath structure mirrors extant git.repo.test.sh:
1. parse arguments
2. validate context
3. run command
4. capture output
5. emit summary

no structural divergence introduced.
