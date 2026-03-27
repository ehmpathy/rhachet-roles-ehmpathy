# review.self: has-questioned-assumptions (r1)

## the artifact reviewed

file: `.behavior/v2026_03_22.fix-git-release/3.3.1.blueprint.product.v1.i1.md`

i re-read the filediff tree, codepath tree, and contracts sections.

---

## question: what hidden technical assumptions were made?

### assumption 1: bash is the right language for domain operations

**what we assume**: domain operations like `get_one_goal_from_input()` and `emit_transport_status()` belong in bash.

**what if the opposite were true?** these could be TypeScript functions invoked via `tsx`.

**evidence for bash**:
- extant `git.release.sh` is bash (line 1 of current skill)
- extant `git.release.operations.sh` is bash
- PATH mock injection pattern in p1/p2 tests works with bash
- composition with `gh` CLI is natural in bash

**evidence against bash**:
- TypeScript would give type safety on flag parse
- complex state machines are harder in bash

**verdict**: bash is correct. the skill is shell-native, composes with `gh` CLI, and extant test infra supports it. TypeScript would add a build step and node dependency.

---

### assumption 2: three transports are exhaustive

**what we assume**: feature-branch, release-branch, release-tag covers all release flows.

**what if the opposite were true?** there could be a fourth transport (e.g., hotfix-branch, canary-deploy).

**evidence for three**:
- wish line 5-10 explicitly names exactly 3 transports
- vision line 25 states "three transports are exhaustive"
- the repo's release workflow (semantic-release) uses exactly these 3

**evidence against three**:
- some repos have hotfix flows that bypass feature branches
- canary deployments could be a fourth "transport"

**verdict**: three is correct for this repo. the wish is explicit. if a fourth transport emerges, the architecture extends: add a fourth adapter.

---

### assumption 3: automerge is the only apply action

**what we assume**: `--apply` only enables automerge (no other mutations).

**what if the opposite were true?** apply could also: approve PR, add labels, request reviews.

**evidence for automerge-only**:
- vision line 83: "automerge is the only apply action"
- extant behavior: `enable_automerge()` is the sole mutation
- wish does not mention other mutations

**evidence against**:
- some workflows require approvals before merge
- labels could drive CI behavior

**verdict**: automerge-only is correct. the wish scope is explicit. other mutations are out of scope.

---

### assumption 4: 15 minute timeout is correct

**what we assume**: watch timeout is 15 minutes, not configurable.

**what if the opposite were true?** timeout could be 5 minutes, 30 minutes, or user-configurable.

**evidence for 15 minutes**:
- vision line 86-88 specifies 15 minutes
- typical CI runs complete in 5-10 minutes
- 15 minutes gives buffer for slow runs

**evidence against**:
- some integration test suites take 20+ minutes
- user might want shorter timeout for fast feedback

**verdict**: 15 minutes is correct for now. the vision specifies it. if users need longer, add `--timeout` flag in future iteration.

---

### assumption 5: SEQUENCE mock will work for watch tests

**what we assume**: the extant SEQUENCE mock pattern can simulate 3+ poll cycles.

**what if the opposite were true?** the mock might not support multiple sequential responses.

**evidence for SEQUENCE**:
- factory research line 15-20 confirms SEQUENCE mock works
- p1 tests use SEQUENCE for multi-step flows
- test-fns provides this capability

**evidence against**:
- haven't verified SEQUENCE supports 4+ element arrays
- time mechanics might be tricky with poll intervals

**verdict**: SEQUENCE will work. factory research confirmed this. if issues arise, the factory blueprint notes `genWatchSequence()` helper as optional improvement.

---

### assumption 6: `--into` is clearer than `--to`

**what we assume**: `--into` is more intuitive for destination.

**what if the opposite were true?** `--to` is shorter and familiar from git.

**evidence for --into**:
- wish line 294 explicitly requests this change
- "into" emphasizes destination, not range
- avoids confusion with `--from X --to Y` range patterns

**evidence against**:
- `--to` is common in CLI tools
- one extra character to type

**verdict**: `--into` is correct. the wisher explicitly requested it. the semantic clarity outweighs brevity.

---

### assumption 7: output functions belong in output.sh

**what we assume**: print_* functions go in a separate output.sh file.

**what if the opposite were true?** they could be inline in git.release.operations.sh or git.release.sh.

**evidence for separate file**:
- extant pattern: output.sh exists and has `print_turtle_header()`
- separation of concerns: output vs logic
- reuse across skills (git.commit uses same pattern)

**evidence against**:
- more files to maintain
- another source to include

**verdict**: separate file is correct. follows extant pattern, enables reuse.

---

### assumption 8: exit code 2 for constraint errors

**what we assume**: exit 2 signals constraint error (user must fix).

**what if the opposite were true?** could use exit 1 for all errors.

**evidence for exit 2**:
- brief `rule.require.exit-code-semantics.md` specifies this
- test-fns provides ConstraintError with exit code 2
- distinguishes "fix this" from "transient failure"

**evidence against**:
- some tools use exit 1 for all errors
- users might not know the distinction

**verdict**: exit 2 is correct. follows repo convention. the distinction enables retry logic.

---

## issues found

### issue: no explicit timeout flag documented

the blueprint assumes 15-minute timeout but doesn't document `--timeout` as a future flag.

**how addressed**: this is not a blocker. the vision specifies 15 minutes as fixed. future iteration can add the flag if needed.

**why it holds**: the wish does not request configurable timeout. scope creep is worse than absent feature.

---

## summary

| assumption | evidence | verdict |
|------------|----------|---------|
| bash for domain operations | extant code, test infra | holds |
| three transports exhaustive | wish explicit | holds |
| automerge-only for apply | vision explicit | holds |
| 15 minute timeout | vision specifies | holds |
| SEQUENCE mock for watch | factory research | holds |
| --into over --to | wisher requested | holds |
| output.sh separation | extant pattern | holds |
| exit code 2 for constraints | repo convention | holds |

**no assumptions invalidated.** the blueprint is grounded in evidence from wish, vision, and extant code.

