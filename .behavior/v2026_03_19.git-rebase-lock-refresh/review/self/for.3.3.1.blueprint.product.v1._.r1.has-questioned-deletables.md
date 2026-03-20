# self-review: has-questioned-deletables

## the question

for each component, ask:
- can this be removed entirely?
- if we deleted this and had to add it back, would we?
- did we optimize a component that should not exist?
- what is the simplest version that works?

---

## component review

### 1. git.branch.rebase.lock.sh (lock dispatcher) — DELETED

**the question:** can we remove this intermediate dispatcher?

**what I found:**
- the original blueprint had `git.branch.rebase.sh` → `git.branch.rebase.lock.sh` → `git.branch.rebase.lock.refresh.sh`
- this is two levels of dispatch for one leaf command
- the pattern exists to support `lock check`, `lock reset`, etc. — but those are hypothetical v2 features

**why deletable:**
- rule of three: don't abstract until 3+ usages exist
- currently only one lock subcommand (`refresh`)
- if we add `lock check` later, we can add the dispatcher then
- premature abstraction is worse than duplication

**how fixed:**
- main dispatcher routes `lock` case directly to `git.branch.rebase.lock.refresh.sh`
- codepath: `git.branch.rebase.sh` → `git.branch.rebase.lock.refresh.sh`
- one file removed from blueprint

**lesson:** dispatchers are justified by the number of leaves they dispatch to, not by hypothetical future leaves.

---

### 2. separate operations functions — INLINED

**the question:** do we need reusable operation functions?

**what I found:**
- original blueprint declared four operations: `detect_lock_file()`, `detect_package_manager()`, `is_pm_installed()`, `run_install()`
- each is 2-5 lines of logic
- each is used exactly once
- to extract them creates indirection without benefit

**why inlinable:**
- no reuse: each operation is specific to lock refresh
- no testability benefit: integration tests cover the flow
- extraction hides flow: reader has to jump between functions
- the skill is ~50 lines total — small enough to read linearly

**how fixed:**
- all logic inline in `git.branch.rebase.lock.refresh.sh`
- no separate operations file
- codepath is linear: guards → detect → install → stage → output

**lesson:** extract to functions for reuse or testability, not for organization. small scripts read better linearly.

---

### 3. yarn support — KEPT

**the question:** do we need yarn support in v1?

**what I found:**
- wisher confirmed: "yeah, why not"
- yarn.lock detection is 1 line; yarn install is 1 line
- removal saves ~10 lines at most
- but: excludes yarn users from v1

**why it holds:**
- marginal cost: detection and install are trivial to add
- significant value: yarn users get support immediately
- no extra complexity: same pattern as pnpm/npm, just one more case
- no new dependencies: yarn detection is just file check + which

**lesson:** include feature when cost is marginal and exclusion is visible. "simplify via removal" applies to complexity, not to coverage of valid usecases.

---

### 4. explicit test cases (pnpm, npm, yarn separately) — KEPT

**the question:** should we merge into data-driven caselist?

**what I found:**
- each case tests a distinct detection path:
  - case1: pnpm-lock.yaml extant → pnpm
  - case2: package-lock.json extant → npm
  - case3: yarn.lock extant → yarn
- caselist would combine these into `{ lockFile, pm, expected }[]`

**why it holds:**
- failure diagnosis: explicit case names appear in jest output
- readability: each case documents one behavior
- maintenance: to add a case is to add a given/when/then block
- caselist hides: reader has to trace through data to understand test

**lesson:** use caselist for variations of same behavior (e.g., edge cases in transform). use explicit cases for distinct behaviors (e.g., different code paths).

---

### 5. simulated rebase setup — KEPT

**the question:** do we need simulated rebase, or just use real rebase?

**what I found:**
- simulated rebase: create `.git/rebase-merge/` dir with required files
- real rebase: init repo, create branches, create conflict, start rebase
- simulated is ~10 lines; real is ~50 lines
- guard tests (no rebase, no lock file) don't need real conflicts

**why it holds:**
- speed: simulated setup is instant; real rebase has git operations
- isolation: simulated doesn't depend on conflict resolution mechanics
- reuse: pattern already used in `git.branch.rebase.take.integration.test.ts`
- real rebase reserved for: tests that verify actual conflict settlement

**lesson:** match test setup to test scope. guard tests need rebase state, not rebase mechanics.

---

## simplifications applied

| component | before | after | principle |
|-----------|--------|-------|-----------|
| lock dispatcher | separate file | deleted | rule of three |
| operations | separate functions | inlined | no reuse justification |

---

## final filediff tree (simplified)

```
src/domain.roles/mechanic/skills/git.branch.rebase/
├─ [~] git.branch.rebase.sh                          # add "lock" case, dispatch to lock.refresh
├─ [+] git.branch.rebase.lock.refresh.sh             # lock refresh skill (inline logic)
├─ [+] git.branch.rebase.lock.refresh.integration.test.ts
├─ [~] git.branch.rebase.take.sh                     # add suggestion for lock files
└─ [~] git.branch.rebase.take.integration.test.ts    # add test for suggestion output
```

removed: `git.branch.rebase.lock.sh` — no longer needed
