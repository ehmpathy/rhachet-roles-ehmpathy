# self-review: has-pruned-yagni

## the question

YAGNI = "you ain't gonna need it"

for each component in the blueprint, ask:
- was this explicitly requested in the vision or criteria?
- is this the minimum viable way to satisfy the requirement?
- did we add abstraction "for future flexibility"?
- did we add features "while we're here"?
- did we optimize before we knew it was needed?

---

## what was requested (from vision + wisher decisions)

| request | source |
|---------|--------|
| `rhx git.branch.rebase lock refresh` command | wish |
| proactive suggestion in `take` when lock files settled | wish |
| support pnpm, npm, yarn | wisher decision |
| rebase-only (not merge) | wisher decision |
| suggest, not auto-refresh | wisher decision |

---

## component review

### 1. git.branch.rebase.sh update (add "lock" case)

**requested?** yes — needed to route the `lock` subcommand

**minimum viable?** yes — one case statement, one exec call

**YAGNI check:** no extras. we don't add "lock check" or "lock reset" — only "lock refresh".

**why it holds:** the dispatcher must route to the skill file. we add exactly one case: `lock)`. we don't add a `lock` dispatcher or support for future `lock` subcommands. if we need `lock check` later, we add it then. the pattern is: one case per implemented command.

**lesson:** dispatchers grow one case at a time. don't pre-wire for hypothetical commands.

---

### 2. git.branch.rebase.lock.refresh.sh

**requested?** yes — this is the main feature

**minimum viable?** yes — guards, detect, install, stage, output. no extras.

**YAGNI check:**
- no `--mode plan` — not requested
- no `--force` flag — not requested
- no fallback to different package managers — we error if preferred pm not available

**why it holds:** the wish was "refresh the lock file when theres an inflight rebase". the blueprint does exactly that:
1. guard: check rebase in progress
2. detect: find lock file and package manager
3. run: execute install
4. stage: git add the lock file
5. output: show what happened

there are no extra steps. each step is required to fulfill the wish. we don't add "nice to haves" like plan mode or force flags — those weren't asked for.

**lesson:** map each blueprint step to a requirement. if a step doesn't trace to a requirement, question it.

---

### 3. yarn support

**requested?** yes — wisher said "yeah, why not"

**minimum viable?** yes — one more detection branch, one more install command

**YAGNI check:** we could have deferred to v2, but wisher explicitly approved

**why it holds:** the wisher was asked directly: "should we support yarn.lock as well?" answer: "yeah, why not". this is explicit approval, not scope creep. we didn't assume yarn would be useful — we asked and got a yes.

**lesson:** when in doubt, ask the wisher. their explicit "yes" converts YAGNI risk into approved scope. their explicit "not yet" keeps scope tight.

---

### 4. suggestion in take.sh output

**requested?** yes — "recommend that the caller of `take` runs that command"

**minimum viable?** yes — detect lock file in settled files, print suggestion

**YAGNI check:**
- we don't auto-refresh — wisher said suggest only
- we don't add a `--quiet` flag to suppress suggestion — not requested

**why it holds:** the wish explicitly said "recommend that the caller of `take` runs that command whenever we detect that they took a `pnpm-lock.yml`". the wisher was asked "should we auto-refresh after take?" and said "not yet, just suggest". this constrains us to suggestion-only, no auto-refresh.

**lesson:** wisher decisions cut scope. "not yet" is a gift — it tells you what NOT to build.

---

### 5. integration tests

**requested?** implicitly yes — tests are required for all features

**minimum viable?** yes — we test each package manager, error cases, and suggestion output

**YAGNI check:**
- no unit tests — shell scripts don't need unit tests
- no mocks — integration tests use real git repos
- no performance tests — not requested

**why it holds:** tests cover exactly what the criteria specify:
- each package manager path (pnpm, npm, yarn)
- each error case (no rebase, no lock file, pm not installed)
- the suggestion output in take.sh

we don't add tests for features we didn't build. we don't add performance benchmarks or stress tests. we test the criteria, no more.

**lesson:** tests follow scope. if we didn't build it, we don't test it. if we built it, we test it.

---

## things we did NOT add

| not added | why not |
|-----------|---------|
| `--mode plan` preview | not requested |
| `--force` flag | not requested |
| auto-refresh after take | wisher said suggest only |
| merge conflict support | wisher said rebase-only for v1 |
| bun.lockb support | not requested, low adoption |
| `lock check` subcommand | not requested |
| `lock reset` subcommand | not requested |
| separate lock dispatcher | deleted in r1 review |

---

## verdict

the blueprint contains exactly what was requested, no more. each component traces back to a wish or wisher decision.

**lesson:** YAGNI is easy when you have explicit wisher decisions. the wisher said "rebase-only", "suggest not auto-refresh", "yes to yarn". these decisions prevent scope creep because there's a clear source of truth for what's in scope.
