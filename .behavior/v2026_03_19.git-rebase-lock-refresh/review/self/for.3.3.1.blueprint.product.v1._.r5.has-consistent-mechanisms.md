# self-review: has-consistent-mechanisms

## the question

for each new mechanism in the blueprint, ask:
- does the codebase already have a mechanism that does this?
- do we duplicate extant utilities, operations, or patterns?
- could we reuse an extant component instead of a new one?

---

## codebase search

before reviewing mechanisms, searched for related patterns:

| search | result |
|--------|--------|
| package manager detection | `set.package.operations.sh` has `_detect_package_manager()` |
| rebase state detection | `git.branch.rebase.operations.sh` has `is_rebase_in_progress()`, `get_git_dir()` |
| turtle vibes output | `git.commit/output.sh`, `set.package/output.sh` have output functions |

---

## mechanism review

### 1. `is_rebase_in_progress()` — REUSE CONFIRMED

**the question:** does extant mechanism match our needs?

**what I found:**
- `git.branch.rebase.operations.sh` has `is_rebase_in_progress()` at line 26-33
- checks if `.git/rebase-merge` or `.git/rebase-apply` directory extant
- already used by `begin.sh`, `continue.sh`, `take.sh`, `abort.sh`

**why it holds:**
- exact same check needed: "is there a rebase in progress?"
- same semantics: returns 0 if in progress, 1 if idle
- single source of truth: if git changes rebase detection, fix once
- already tested: covered by extant integration tests

**how used:** blueprint says `source shared operations` and `guard: is_rebase_in_progress` — correct.

**lesson:** always check the operations file first. skill groups share detection logic.

---

### 2. `get_git_dir()` — REUSE CONFIRMED

**the question:** does extant mechanism match our needs?

**what I found:**
- `git.branch.rebase.operations.sh` has `get_git_dir()` at line 18-20
- uses `git rev-parse --git-dir` which handles worktrees correctly
- already used by other rebase skills

**why it holds:**
- exact same need: find `.git` directory to check rebase state
- worktree handling: important edge case already solved
- consistency: all git.branch.rebase skills use same function

**how used:** blueprint reuses from shared operations — correct.

**lesson:** git directory resolution is subtle with worktrees. reuse tested code.

---

### 3. `_detect_package_manager()` from set.package — CANNOT REUSE

**the question:** can we reuse extant package manager detection?

**what I found:**
- `set.package.operations.sh` has `_detect_package_manager()` at line 126-133
- logic: returns "npm" if `package-lock.json` extant, otherwise "pnpm"

**why it cannot be reused:**

| aspect | set.package | lock refresh |
|--------|-------------|--------------|
| yarn support | no | yes (wisher: "why not") |
| no lock behavior | default to pnpm | error (must have lock) |
| priority | npm > pnpm | pnpm > npm > yarn |
| install check | none | check `which` first |

**why new mechanism is correct:**
- set.package installs packages where lock may not exist yet
- lock refresh regenerates extant lock mid-rebase
- different contexts → different semantics → different mechanism

**how fixed:** blueprint creates new detection in `lock.refresh.sh` — correct given requirements.

**lesson:** same name does not mean same mechanism. check semantics, not just function name.

---

### 4. turtle vibes output — PATTERN REUSE (inline)

**the question:** how to use extant output pattern?

**what I found:**
- `git.commit/output.sh` has `print_turtle_header()`, `print_tree_start()`, etc.
- `set.package/output.sh` has same pattern
- `git.branch.rebase/` has no `output.sh` yet

**options:**
1. source from `../git.commit/output.sh` — adds cross-skill dependency
2. create `git.branch.rebase/output.sh` — new file for single consumer
3. inline in `lock.refresh.sh` — minimal, YAGNI

**why inline is correct:**
- only one new skill (`lock.refresh`) needs output functions
- rule of three: don't create shared file for single consumer
- extant skills (`begin`, `continue`, `take`, `abort`) don't use turtle vibes output
- if future skills need it, extract then

**how fixed:** blueprint updated to "define turtle vibes output functions (inline)" instead of "source from output.sh"

**lesson:** pattern reuse can mean inline, not just source. evaluate consumers first.

---

### 5. `detect_lock_file()` — NEW MECHANISM

**the question:** is there an extant mechanism for this?

**what I found:**
- searched for `lock.*file\|lockfile\|pnpm-lock\|package-lock`
- no extant operation returns lock file name
- `set.package` checks lock extant but returns "pnpm" or "npm", not filename

**why new is correct:**
- need: return filename for later `git add`
- extant: returns package manager name, not lock filename
- different return type → different mechanism

**lesson:** detection that returns value vs detection that returns boolean are different mechanisms.

---

### 6. `is_pm_installed()` — NEW MECHANISM

**the question:** is there an extant mechanism for this?

**what I found:**
- searched for `which.*pnpm\|command -v\|pm.*installed`
- no extant operation checks if package manager binary is available
- `set.package` assumes pnpm/npm available

**why new is correct:**
- `set.package` targets developers who certainly have pnpm/npm
- `lock.refresh` may encounter yarn.lock in repo where yarn is not installed
- explicit check enables clear error: "yarn not found, install yarn"

**lesson:** assumptions differ by context. install commands can assume; refresh commands must verify.

---

## issues found and fixed

### issue 1: stale codepath tree section

**what I found:** codepath tree still had `git.branch.rebase.lock.sh` section but filediff tree and note said "no separate lock dispatcher"

**how fixed:** removed stale section from blueprint.

**lesson:** when component is deleted, check all blueprint sections for stale references.

---

### issue 2: ambiguous "from output.sh"

**what I found:** operations decomposition said "reuse from output.sh" without specifying which one

**how fixed:** clarified to "inline in lock.refresh.sh, pattern from git.commit/output.sh"

**lesson:** "reuse pattern X" must specify source or state inline.

---

### issue 3: codepath tree inconsistent with inline decision

**what I found:** codepath tree said "source turtle vibes output" but we decided inline

**how fixed:** changed to "define turtle vibes output functions (inline)"

**lesson:** codepath tree and operations decomposition must stay in sync.

---

## summary

| mechanism | action | reason |
|-----------|--------|--------|
| `is_rebase_in_progress()` | reuse | exact match |
| `get_git_dir()` | reuse | exact match |
| `_detect_package_manager()` | new | different semantics |
| turtle vibes output | inline | YAGNI, single consumer |
| `detect_lock_file()` | new | returns filename, not pm name |
| `is_pm_installed()` | new | no extant equivalent |

**finding:** blueprint correctly reuses shared operations. new mechanisms are justified by different requirements or absence of extant equivalent. three blueprint inconsistencies found and fixed.
