# self-review: has-questioned-assumptions

## the question

for each technical assumption, ask:
- what do we assume here without evidence?
- what if the opposite were true?
- is this architecture choice based on evidence or habit?
- what exceptions or counterexamples exist?
- could a simpler approach work?

---

## assumption review

### 1. lock file presence indicates package manager

**the assumption:** if `pnpm-lock.yaml` exists, use pnpm; if `package-lock.json` exists, use npm; etc.

**what if opposite were true?**
- a repo could have a stale lock file from a migration (e.g., moved from npm to pnpm but package-lock.json still exists)
- a repo could have multiple lock files from different team members

**evidence:**
- this is standard practice in the ecosystem (npm, pnpm, yarn all detect via lock file)
- CI systems use the same heuristic
- corepack uses similar detection

**why it holds:**
- the lock file is the artifact produced by the package manager
- the lock file is what CI uses to install dependencies
- if the lock file is stale, the user should clean it up — not our responsibility to detect
- we follow the same heuristic that every CI system follows

**lesson:** when in doubt, follow ecosystem conventions. if npm, pnpm, yarn, CI systems, and corepack all use the same detection method, that's strong evidence it's the right approach. don't invent novel heuristics when standard ones exist.

---

### 2. priority order: pnpm > npm > yarn

**the assumption:** when multiple lock files exist, prefer pnpm, then npm, then yarn.

**what if opposite were true?**
- a team might prefer npm over pnpm
- yarn users might be frustrated that yarn is lowest priority

**evidence:**
- pnpm is stricter (hoist rules) so safer to prefer
- npm is always available (comes with node)
- yarn requires separate install

**counterexample:**
- what about bun.lockb? not supported in v1.

**why it holds:**
- multiple lock files is already an edge case — most repos have one
- pnpm's strict mode catches more issues than npm's flat hoist
- npm is the fallback because it's always installed with node
- yarn at lowest priority because it requires extra install step
- bun is too new for v1 — revisit when adoption grows

**lesson:** when multiple valid options exist, rank by: (1) strictness (catches more issues), (2) availability (always works), (3) adoption (users can install if needed). this creates a defensible priority order instead of arbitrary choice.

---

### 3. npm is always available

**the assumption:** we don't check if npm is installed; we assume it exists.

**what if opposite were true?**
- corepack can disable npm in favor of pnpm
- docker images might have pnpm but not npm

**evidence:**
- npm comes bundled with node
- corepack-disabled npm is rare and explicit
- if someone disabled npm, they likely have pnpm as primary

**why it holds:**
- npm has been bundled with node since v0.6.3 (2011)
- there is no scenario where node exists but npm doesn't, unless user explicitly removed it
- if user explicitly removed npm, they know what they're doing
- to check `which npm` adds latency for no practical benefit

**lesson:** don't check for invariants. npm bundled with node is a 15-year invariant. to add a check for "does npm exist" is defensive programming that defends against no real threat.

---

### 4. `pnpm install` / `npm install` regenerates lock from package.json

**the assumption:** install command will produce a fresh lock file that matches the current package.json.

**what if opposite were true?**
- install might fail if package.json is invalid
- install might fetch unexpected versions if registry changed

**evidence:**
- this is exactly what the install command does
- the lock file is derived from package.json + registry state

**potential issue:**
- what if the rebase introduced a conflicted package.json? install will fail.

**why it holds:**
- the install command is designed to reconcile package.json with lock file
- if install fails, it's a real error that user needs to fix
- we can't do better than `pnpm install` — it's the authoritative command
- we show error output so user can diagnose

**lesson:** don't try to be smarter than the tool. `pnpm install` is the authoritative way to regenerate a lock file. if it fails, that's signal, not noise. show the error and let user fix the root cause.

---

### 5. stage lock file is safe mid-rebase

**the assumption:** after install, we can `git add pnpm-lock.yaml` without issues.

**what if opposite were true?**
- what if there are other staged changes that user hasn't reviewed?
- what if the lock file is in `.gitignore`?

**evidence:**
- we only stage the lock file, not other files
- if user ran `take`, they already decided to settle the lock file
- lock files are never gitignored (they must be committed)

**why it holds:**
- `git add` is additive — it doesn't unstage other files
- the user already made a decision to settle the lock file via `take`
- the lock file is a derived artifact from `install` — the user expects it to be staged
- gitignored lock files don't exist in practice — CI would fail

**lesson:** trust prior user decisions. the user ran `take` which signals intent to settle the lock file. running `git add` on that same file is a continuation of that intent, not a new decision.

---

### 6. suggestion shown once for multiple lock files in `take .`

**the assumption:** if user takes multiple files and some are lock files, show suggestion once (not per lock file).

**what if opposite were true?**
- to show per lock file would be noisy
- but: user might not notice the suggestion if it's collapsed

**design choice:**
- single suggestion is cleaner
- the command `rhx git.branch.rebase lock refresh` handles all lock files anyway

**why it holds:**
- the suggestion is to run one command (`lock refresh`)
- that command handles all lock files regardless of which were taken
- repeat suggestions add noise without new information
- user reads one suggestion and knows what to do

**lesson:** suggestions are for action, not for accounting. one actionable suggestion is better than N identical suggestions. the user doesn't need to know "pnpm-lock and package-lock were both taken" — they need to know "run lock refresh".

---

### 7. rebase detection via git internals (`.git/rebase-merge`)

**the assumption:** presence of `.git/rebase-merge` or `.git/rebase-apply` indicates rebase in progress.

**what if opposite were true?**
- git could change internal file structure in future versions

**evidence:**
- this is the documented way to detect rebase state
- used by git hooks, git prompt scripts, IDE integrations
- pattern already used in `git.branch.rebase.take.sh`

**why it holds:**
- git's internal directory structure has been stable for 15+ years
- breaking changes to `.git/` would break every git hook, IDE, and prompt script
- git maintainers understand this and preserve compatibility
- we already use this pattern in `git.branch.rebase.take.sh` — consistency matters

**lesson:** stable APIs remain stable because breaking them has cascading consequences. git's internal structure is a de facto API used by thousands of tools. it won't change without a multi-year deprecation cycle.

---

### 8. single package.json at repo root

**the assumption:** there is one package.json and one lock file at the repo root.

**what if opposite were true?**
- monorepos have multiple package.json files
- workspaces have root lock file but many package.json

**evidence:**
- monorepos with workspaces: root lock file covers all packages
- `pnpm install` at root handles workspaces correctly

**potential issue:**
- what if conflict is in a nested package.json? lock refresh at root should still work.

**why it holds:**
- lock files are always at root, even in monorepos
- `pnpm install` at root regenerates the root lock file
- nested package.json files don't have their own lock files in pnpm/npm workspaces
- yarn berry (v3+) also uses a single root lock file

**lesson:** understand workspace semantics. monorepos have multiple package.json files but a single root lock file. the lock file is the single source of truth for all workspace packages. regenerate at root and all packages are covered.

---

## assumptions validated

| assumption | holds? | reason |
|------------|--------|--------|
| lock file → package manager | yes | industry standard |
| pnpm > npm > yarn priority | yes | pnpm strictness, npm availability |
| npm always available | yes | bundled with node |
| install regenerates lock | yes | command semantics |
| stage is safe | yes | additive operation |
| one suggestion | yes | cleaner UX |
| git internals stable | yes | documented API |
| root package.json | yes | workspaces pattern |

no assumptions require blueprint changes.
