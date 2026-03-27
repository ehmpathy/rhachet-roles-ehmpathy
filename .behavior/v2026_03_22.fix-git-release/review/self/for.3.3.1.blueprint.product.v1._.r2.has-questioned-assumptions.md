# review.self: has-questioned-assumptions (r2)

## the artifact reviewed

file: `.behavior/v2026_03_22.fix-git-release/3.3.1.blueprint.product.v1.i1.md`

i re-read:
- filediff tree (lines 16-29)
- codepath tree (lines 33-86)
- contracts (lines 136-163)
- execution order (lines 166-174)

---

## question: what hidden technical assumptions were made?

### assumption 1: bash is the right language for domain operations

**what we assume without evidence**: domain operations like `get_one_goal_from_input()` and `emit_transport_status()` belong in bash.

**what if the opposite were true?** these could be TypeScript functions invoked via `tsx`.

**is this based on evidence or habit?**

evidence (from codebase):
- extant `git.release.sh` is bash — line 1: `#!/usr/bin/env bash`
- extant `git.release.operations.sh` is bash
- PATH mock injection pattern in p1/p2 tests is designed for bash scripts
- composition with `gh` CLI is natural in bash (pipes, subshells)

this is based on evidence. the skill is shell-native.

**could a simpler approach work?** no. TypeScript would require:
- tsx installation and invocation
- node_modules dependency at execution time
- additional build step

bash is simpler for this shell-native skill.

**verdict**: bash is correct.

---

### assumption 2: three transports are exhaustive

**what we assume without evidence**: feature-branch, release-branch, release-tag covers all release flows.

**what if the opposite were true?** there could be a fourth transport (hotfix-branch, canary-deploy, prep-deploy).

**evidence**:
- wish line 5-10: "the `git.release` skill has 3 different release transports"
- wish is authoritative for scope
- semantic-release (the release tool) uses these 3 stages

**exceptions or counterexamples**:
- hotfix flows exist in some repos (branch directly to prod)
- canary deployments use separate channels

**why these don't apply**: the wish explicitly scopes to 3 transports. the architecture supports extension: add a fourth adapter if needed later.

**verdict**: three is correct for this scope.

---

### assumption 3: automerge is the only apply action

**what we assume**: `--apply` only enables automerge.

**what if the opposite were true?** apply could also: approve PR, add labels, request reviews.

**evidence**:
- vision line 83: "automerge is the only apply action"
- extant `enable_automerge()` is the sole mutation in current code
- wish does not mention other mutations

**exceptions**: some repos require manual approval. those repos would need a different workflow (outside this skill's scope).

**verdict**: automerge-only is correct.

---

### assumption 4: 15 minute timeout is correct

**what we assume**: watch timeout is 15 minutes, fixed.

**what if the opposite were true?** timeout could be 5 minutes, 30 minutes, or configurable.

**evidence**:
- vision line 86-88: "on timeout: exit with error, show partial progress" (specifies 15 min)
- typical CI runs: 5-10 minutes
- 15 minutes provides buffer without excessive wait

**could a simpler approach work?** a shorter timeout (5 min) would fail fast but miss slow integrations. a longer timeout (30 min) wastes time. 15 minutes balances.

**verdict**: 15 minutes is correct.

---

### assumption 5: SEQUENCE mock works for 3+ poll cycles

**what we assume**: the extant SEQUENCE mock pattern supports 3+ sequential responses.

**what if the opposite were true?** the mock might only support 1-2 responses.

**evidence**:
- factory research [3.1.4] line 15-20 confirms SEQUENCE mock works
- p1 tests use SEQUENCE for multi-step flows (I verified this)
- test-fns documentation shows array support

**verification**: i checked `git.release.p1.integration.test.ts` — SEQUENCE is used with arrays of 2+ elements.

**verdict**: SEQUENCE will work.

---

### assumption 6: `--into` is clearer than `--to`

**what we assume**: destination clarity improves with `--into`.

**what if the opposite were true?** `--to` is shorter and familiar.

**evidence**:
- wish line 294: "replace `--to` with `--into`"
- wisher explicitly requested this change
- `--from X --to Y` is ambiguous (range vs destination)
- `--into` emphasizes destination unambiguously

**verdict**: `--into` is correct per wisher request.

---

### assumption 7: output functions belong in separate output.sh

**what we assume**: print_* functions go in output.sh, not inline.

**what if the opposite were true?** inline in git.release.sh or operations.sh.

**evidence for separation**:
- extant output.sh exists with `print_turtle_header()`
- git.commit skill uses same pattern
- separation of concerns: display vs logic

**could a simpler approach work?** inline would reduce files but increase cognitive load per file. separation is cleaner.

**verdict**: separate file is correct.

---

### assumption 8: exit code 2 for constraint errors

**what we assume**: exit 2 signals "user must fix".

**what if the opposite were true?** exit 1 for all errors.

**evidence**:
- brief `rule.require.exit-code-semantics.md` specifies exit 2 for constraints
- test-fns `ConstraintError` has exit code 2
- distinction enables retry logic (exit 1 = transient, exit 2 = user fix needed)

**verdict**: exit 2 is correct per repo convention.

---

## issues found

### non-issue: timeout not configurable

the blueprint assumes 15-minute timeout without `--timeout` flag.

**why it holds**: the wish does not request configurable timeout. the vision specifies 15 minutes as fixed. this is an intentional scope boundary, not an oversight.

---

## summary

| assumption | questioned? | evidence found | verdict |
|------------|-------------|----------------|---------|
| bash for operations | yes | extant code, test infra | holds |
| three transports | yes | wish explicit | holds |
| automerge-only | yes | vision explicit | holds |
| 15 min timeout | yes | vision specifies | holds |
| SEQUENCE mock | yes | factory research, test code | holds |
| --into over --to | yes | wisher requested | holds |
| output.sh separation | yes | extant pattern | holds |
| exit code 2 | yes | repo convention | holds |

**no hidden assumptions invalidated.** each assumption is grounded in evidence from wish, vision, extant code, or repo conventions.

