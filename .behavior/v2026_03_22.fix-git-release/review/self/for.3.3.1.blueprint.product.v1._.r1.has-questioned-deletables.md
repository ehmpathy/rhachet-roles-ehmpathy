# review.self: has-questioned-deletables (r1)

## the artifact reviewed

file: `.behavior/v2026_03_22.fix-git-release/3.3.1.blueprint.product.v1.i1.md`

i re-read the filediff tree, codepath tree, and test coverage sections.

---

## question: can we delete before we optimize?

### domain operations (6 new operations proposed)

| operation | can delete? | verdict |
|-----------|-------------|---------|
| get_one_goal_from_input() | **no** | the wish mandates 12 inference scenarios (lines 74-120). logic must live somewhere. |
| get_all_flags_from_input() | **no** | flags must be parsed. the `--apply` implies `--watch` logic must live somewhere. |
| get_one_transport_status() | **no** | the wish mandates uniform state detection across 3 transport types. |
| emit_transport_status() | **no** | the wish mandates uniform stdout. this is the core deliverable. |
| emit_transport_watch() | **no** | the wish mandates watch with 3+ poll cycles visible. |
| emit_one_transport_status_exitcode() | **maybe** | could inline as `exit 0` / `exit 2`. |

**action**: consider inline of emit_one_transport_status_exitcode() if it's just a one-liner.

**decision**: keep as named function. it clarifies intent and the criteria (2.3 line 67) explicitly demands this contract. the name documents the semantic exit code behavior.

### output functions (7 new functions proposed)

| function | can delete? | verdict |
|----------|-------------|---------|
| print_release_header() | **no** | uniform `🌊 release:` header mandated |
| print_check_status() | **no** | uniform check status mandated |
| print_automerge_status() | **no** | uniform automerge status mandated |
| print_watch_header() | **no** | uniform `🥥 let's watch` mandated |
| print_watch_poll() | **no** | uniform poll lines mandated |
| print_watch_result() | **no** | uniform terminal state mandated |
| print_hint() | **no** | uniform hints mandated |

**action**: could consolidate into fewer functions?

**decision**: keep separate. each function maps to one visual element in the output tree. composition is clearer than a monolithic print function with many parameters.

### files

| file | can delete? | verdict |
|------|-------------|---------|
| git.release.play.integration.test.ts | **no** | journey tests mandated by wish |
| git.release.spec.diagram.md update | **maybe** | only if diagram changes |
| git.release.spec.matrix.md update | **maybe** | only if matrix changes |

**action**: mark diagram and matrix updates as conditional.

**decision**: updated blueprint to note these are conditional updates ("if needed").

### simplest version?

the simplest version that satisfies the wish is:
1. uniform output via emit_transport_status() — cannot simplify further
2. uniform watch via emit_transport_watch() — cannot simplify further
3. flag parse with new flags — cannot simplify further
4. journey tests with snapshots — cannot simplify further

the blueprint is already minimal. each component directly serves a wish requirement.

---

## issue found

### issue: diagram/matrix updates may be unnecessary

the blueprint lists `[~] git.release.spec.diagram.md` and `[~] git.release.spec.matrix.md` as updates, but these may not change.

**how addressed**: the blueprint already notes "update diagram if needed" (line 14) and "update matrix for new states" (line 13). the conditional language is present.

**why it holds**: the blueprint uses `[~] update` which doesn't commit to changes — it signals review is needed. actual changes depend on execution findings.

---

## summary

| category | proposed | deletable? | kept |
|----------|----------|------------|------|
| domain operations | 6 | 0 | 6 |
| output functions | 7 | 0 | 7 |
| test files | 1 | 0 | 1 |
| spec updates | 3 | conditional | 3 |

**the blueprint is minimal.** each component directly serves a wish requirement. no components can be deleted without a failure to satisfy the wish.

