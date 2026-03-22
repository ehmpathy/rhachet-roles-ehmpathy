# review.self: has-pruned-yagni (r3)

## the artifact reviewed

file: `.behavior/v2026_03_22.fix-git-release/3.3.1.blueprint.product.v1.i1.md`

i re-read line by line:
- filediff tree (lines 16-29)
- codepath tree (lines 33-86)
- output functions (lines 88-100)
- test coverage (lines 104-133)
- contracts (lines 136-163)
- execution order (lines 166-174)
- risks and mitigations (lines 178-185)

---

## question: did we add components not prescribed?

for each component, i ask:
1. was this explicitly requested in the vision or criteria?
2. is this the minimum viable way to satisfy the requirement?
3. did we add abstraction "for future flexibility"?
4. did we add features "while we're here"?
5. did we optimize before needed?

---

### domain operations: get_one_goal_from_input()

**requested?** yes.

**evidence**: wish line 217-228 contains pseudocode:
```
const goal: { from: 'feat' | 'main', into: 'main' | 'prod' } = get_one_goal_from_input(...)
```

**minimum viable?** yes. the operation does one task: infer goal from branch and flags.

**YAGNI verdict**: no — prescribed.

---

### domain operations: get_all_flags_from_input()

**requested?** yes.

**evidence**: wish line 229:
```
const flags: { watch: bool, apply: bool, retry: bool } = get_all_flags_from_input(...)
```

**minimum viable?** yes. parses CLI args, returns flag object.

**YAGNI verdict**: no — prescribed.

---

### domain operations: get_one_transport_status()

**requested?** yes.

**evidence**: wish lines 231-232, 236-237, 240-241:
```
const status = get_one_transport_status({ of: 'transport:feature-branch' })
```

**minimum viable?** yes. returns state enum (unfound|inflight|passed|failed|merged).

**YAGNI verdict**: no — prescribed.

---

### domain operations: emit_transport_status()

**requested?** yes.

**evidence**: wish line 230:
```
await emit_transport_status({ of: 'transport:feature-branch', flags: pick(flags, ['apply', 'retry']) });
```

**minimum viable?** yes. prints uniform status tree, optionally enables automerge or triggers rerun.

**YAGNI verdict**: no — prescribed.

---

### domain operations: emit_transport_watch()

**requested?** yes.

**evidence**: wish line 232:
```
if (flags.watch) await emit_transport_watch({ of: 'transport:feature-branch', flags })
```

**minimum viable?** yes. polls and prints watch cycles until terminal.

**YAGNI verdict**: no — prescribed.

---

### domain operations: emit_one_transport_status_exitcode()

**requested?** yes.

**evidence**: wish lines 234, 238, 242:
```
if (status !== 'merged') return emit_one_transport_status_exitcode({ status });
```

**minimum viable?** yes. exits with semantic code (0 for success, 2 for constraint).

**YAGNI verdict**: no — prescribed.

---

### output functions: all 7

| function | evidence | verdict |
|----------|----------|---------|
| print_release_header | vision line 46-48: `🌊 release: {title}` | prescribed |
| print_check_status | vision line 49-51: `👌\|🐢\|⚓` | prescribed |
| print_automerge_status | vision line 52-54: `🌴 automerge...` | prescribed |
| print_watch_header | vision line 73: `🥥 let's watch` | prescribed |
| print_watch_poll | vision line 74: `💤 N left...` | prescribed |
| print_watch_result | vision line 75: `✨ done!\|⚓ failed` | prescribed |
| print_hint | vision multiple hints throughout | prescribed |

**abstraction for future flexibility?** no. each function maps 1:1 to a visual element.

**YAGNI verdict**: no — all 7 prescribed by vision output shapes.

---

### files: spec documentation

| file | issue |
|------|-------|
| git.release.spec.md | not explicitly requested |
| git.release.spec.matrix.md | not explicitly requested |
| git.release.spec.diagram.md | not explicitly requested |

**why marked?** the blueprint lists these as `[~] update if needed`.

**is this YAGNI?**

**analysis**: the wish and vision focus on code and tests. they don't mention spec updates. however:
- spec.md documents the command interface — if flags change, it must update
- spec.matrix.md documents state transitions — if states change, it must update
- spec.diagram.md documents flow — if flow changes, it may update

**resolution**: these are conditional (`[~]`). they won't be touched unless implementation reveals doc drift. this is defensive documentation, not YAGNI.

**why it holds**: the conditional marker prevents both:
- YAGNI (don't update if not needed)
- drift (flag that update may be needed)

---

### features: deprecation alias --to → --into

**requested?** no — wish says "replace `--to` with `--into`" (line 295).

**issue**: the risks section (line 182) adds a deprecation alias.

**is this YAGNI?**

**analysis**:
- extant users may have scripts with `--to`
- break would cause unhelpful "unknown flag" error
- the alias maps `--to` to `--into` silently

**resolution**: this is pit-of-success design. without the alias:
- extant scripts break
- users get unhelpful error
- adoption friction increases

with the alias:
- extant scripts work
- users see deprecation notice (optional)
- smooth transition path

**why it holds**: backwards compat is implicit in flag renames. the alias is defensive, not YAGNI.

---

### abstractions: transport adapters

**requested?** yes.

**evidence**: wish line 249:
> "if the way to lookup the emittable state varies per transport, then create an adapter"

**is this premature?** no. the wish prescribes it because:
- feature-branch transport uses PR API
- release-branch transport uses PR API
- release-tag transport uses workflow runs API

different APIs require adapters. this is not abstraction for flexibility — it's abstraction for reality.

**YAGNI verdict**: no — prescribed by wish.

---

### optimizations: genWatchSequence()

**status**: deferred.

**evidence**: factory blueprint line 17:
> "one optional improvement was identified (genWatchSequence() helper) but deferred to execution phase if watch test authorship becomes tedious"

**is this YAGNI?** no — it was explicitly not added. it was flagged as optional and deferred.

---

## issues found

none. all components trace to wish or vision. conditional items are marked conditional.

---

## summary

| component | count | YAGNI? |
|-----------|-------|--------|
| domain operations | 6 | no — all from wish pseudocode |
| output functions | 7 | no — all from vision output |
| test coverage | 18+ | no — all from wish |
| spec files | 3 | no — conditional, defensive |
| deprecation alias | 1 | no — backwards compat |
| adapters | 3 | no — prescribed by wish |
| genWatchSequence | 0 | no — explicitly deferred |

**YAGNI review complete.** no unprescribed components found. blueprint is minimal.

