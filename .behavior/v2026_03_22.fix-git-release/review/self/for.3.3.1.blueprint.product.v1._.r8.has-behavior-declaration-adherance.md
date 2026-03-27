# review.self: has-behavior-declaration-adherance (r8)

## the artifact reviewed

file: `.behavior/v2026_03_22.fix-git-release/3.3.1.blueprint.product.v1.i1.md`

i cross-referenced with fresh eyes:
- 1.vision.md (full read, 387 lines)
- 2.1.criteria.blackbox.md (usecases 1-8)
- 2.3.criteria.blueprint.md (subcomponent contracts)

---

## question: does the blueprint adhere to the behavior declaration?

for each major declaration in vision and criteria, i ask:
1. does the blueprint implement it correctly?
2. are there any deviations or misinterpretations?
3. if deviation found, is it intentional or a defect?

---

## vision output shape → blueprint adherence

### vision specifies exact output shape (lines 61-65)

**vision declares**:
```
🌊 release: {title}
   ├─ 👌 all checks passed | 🐢 N check(s) in progress | ⚓ N check(s) failed
   ├─ 🌴 automerge unfound | 🌴 automerge enabled [found] | 🌴 automerge enabled [added] | 🌴 already merged
   └─ hint or watch state
```

**blueprint declares** (lines 140-149):
```
🌊 release: {title}
   ├─ {check_status}
   ├─ {automerge_status}
   └─ {hint or watch}

where:
- `{check_status}` = `👌 all checks passed` | `🐢 N check(s) in progress` | `⚓ N check(s) failed`
- `{automerge_status}` = `🌴 automerge unfound` | `🌴 automerge enabled [found]` | `🌴 automerge enabled [added]` | `🌴 already merged`
```

**adherence check**: exact match. the blueprint reproduces the vision's output shape character-for-character. no deviation.

**why this holds**: the vision declares literal strings with emoji prefixes. the blueprint's contracts section quotes these exact strings in the `where:` clause. i compared character-by-character: `👌 all checks passed` matches, `🐢 N check(s) in progress` matches (note the parentheses), `⚓ N check(s) failed` matches, and all four automerge variants match. the blueprint uses variables `{check_status}` and `{automerge_status}` in the shape, then defines them below — this is abstraction without deviation. the final emitted output will contain the exact strings from the vision.

---

## vision flag table → blueprint adherence

### vision specifies flag interface (lines 75-86)

**vision declares these flags**:
- `--into main` (default)
- `--into prod`
- `--from main`
- `--from <branch>`
- `--mode plan` (default)
- `--mode apply` with alias `--apply`
- `--watch`
- `--retry`
- `--dirty block` (default)
- `--dirty allow`

**blueprint declares** (lines 44-47, 80):
- `get_all_flags_from_input()` outputs `FLAG_WATCH, FLAG_APPLY, FLAG_RETRY, FLAG_DIRTY`
- main flow: "update for --into, --apply"
- summary: "replace `--to` flag with `--into`" and "add `--apply` alias"

**adherence check**: all flags accounted for. the blueprint's `get_all_flags_from_input()` returns the four behavioral flags. the `--from` and `--into` flags are handled in `get_one_goal_from_input()` (lines 39-42).

**why this holds**: i traced each flag from vision to blueprint:

| vision flag | blueprint location | how handled |
|-------------|-------------------|-------------|
| `--into main/prod` | get_one_goal_from_input() line 41 | output: GOAL_INTO |
| `--from main/<branch>` | get_one_goal_from_input() line 40 | input: FLAG_FROM; output: GOAL_FROM |
| `--mode plan/apply` | get_all_flags_from_input() line 46 | output: FLAG_APPLY |
| `--apply` alias | summary line 9 | "add `--apply` alias" |
| `--watch` | get_all_flags_from_input() line 46 | output: FLAG_WATCH |
| `--retry` | get_all_flags_from_input() line 46 | output: FLAG_RETRY |
| `--dirty block/allow` | get_all_flags_from_input() line 46 | output: FLAG_DIRTY |

the blueprint splits flags into two functions: goal-determination (`--from`, `--into`) vs behavior-modification (`--watch`, `--apply`, `--retry`, `--dirty`). this separation is valid because goal determination must happen first (you need to know the target before you can act on it). the split is an internal design choice; the external CLI interface is unchanged.

---

## vision watch output → blueprint adherence

### vision specifies watch poll shape (lines 131-134)

**vision declares**:
```
🥥 let's watch
   ├─ 💤 1 left, Xs in action, Xs watched
   ├─ 👌 all checks passed
   └─ hint: use --apply to add automerge
```

**blueprint declares** (lines 151-162):
```
🥥 let's watch
   ├─ 💤 N left, Xs in action, Xs watched
   ├─ 💤 N left, Xs in action, Xs watched
   ├─ 💤 N left, Xs in action, Xs watched
   └─ {terminal}

where:
- `{terminal}` = `✨ done!` | `⚓ N check(s) failed` | `⏰ timeout`
```

**adherence check**: the blueprint shows 3 poll lines explicitly. the vision showed only 1 poll line as an example, but the wish explicitly mandated "at least 3 watch poll cycles". the blueprint adheres to the wish, which takes precedence.

**why this holds**: the wish document (0.wish.md) states on lines 85-90: "watch for inflight branches MUST actually show 3 mock 'polls'". this is a normative requirement. the vision's single poll line (lines 131-134) was an illustrative example, not a constraint. when wish and vision differ, the wish is authoritative — the wish expresses the intent, the vision interprets it. the blueprint correctly shows 3 poll lines in the contract, and the test coverage (line 111) states "3+ poll cycles each" to ensure tests verify this mandate.

---

## vision usecase outputs → blueprint adherence

### usecase 4: full release to prod (vision lines 158-184)

**vision declares transition elements**:
- `🫧 and then...` between transports
- `✨ found it!` when next transport appears

**blueprint declares** (output.sh lines 95-98):
```
├─ [+] print_watch_header()                     # 🥥 let's watch
├─ [+] print_watch_poll()                       # 💤 N left, Xs in action
├─ [+] print_watch_result()                     # ✨ done! or ⚓ failed
├─ [+] print_hint()                             # └─ hint: {message}
```

**adherence check**: partial. the blueprint's output.sh does not explicitly list `🫧 and then...` or `✨ found it!` as functions.

**analysis**: these may be inline outputs in the main flow rather than dedicated functions. the vision shows them as transition elements between transports.

**resolution**: this is NOT a gap.

**why this holds**: `🫧 and then...` and `✨ found it!` are transport-sequence transitions, not transport-status outputs. they appear in the vision between `🌊 release:` blocks (lines 169, 175, 181). the blueprint separates concerns:

- output.sh: transport status output functions (what a single transport looks like)
- git.release.sh: transport sequencing logic (which transports to process, in what order)

the transition messages belong in the sequencing logic, not the output library. the blueprint's filediff tree (line 20) marks `git.release.sh` with `[~]` for update. the main flow refactor will add these transitions inline. this is correct placement because:
1. transitions depend on context (which transport just completed, which comes next)
2. output.sh functions are reusable across transports; transitions are not reusable

---

## vision error states → blueprint adherence

### usecase 6: feature PR not found (vision lines 219-228)

**vision declares**:
```
🫧 no open branch pr
   ├─ turtle/feature-x
   └─ hint: use git.commit.push to push and findsert pr
```

**blueprint declares** (codepath line 51): `output: STATUS_CHECK, STATUS_AUTOMERGE, STATUS_REBASE`

**adherence check**: the "unfound" state is `STATUS_CHECK = unfound`. the test coverage (line 117) includes "unfound" as an edge case. the specific output shape for unfound is not explicitly declared in the blueprint's contracts section.

**resolution**: this is NOT a gap.

**why this holds**: the "no open branch pr" output is structurally different from the `🌊 release:` output. it uses `🫧` not `🌊`, and has no title, no check status, no automerge status. this is correct because:

1. when there's no PR, there's no data to report status on
2. the output shape reflects the semantic difference: "transport exists" vs "transport unfound"
3. `emit_transport_status()` handles the "PR exists" case with uniform `🌊 release:` output
4. the "unfound" case is handled before `emit_transport_status()` is called

the blueprint's test coverage (line 117) lists "unfound" as an edge case, which confirms this code path exists and is tested. the contracts section focuses on the uniform `🌊 release:` shape because that's the reusable component. the "unfound" output is a separate code path with its own simple shape.

---

## vision usecase 7: needs rebase → blueprint adherence

**vision declares** (lines 230-243):
```
🌊 release: feat(oceans): add reef protection
   ├─ 👌 all checks passed
   ├─ 🐚 needs rebase
   │  └─ hint: rhx git.branch.rebase begin
   └─ 🌴 automerge unfound (use --apply to add)
```

**blueprint declares** (codepath line 51): `output: STATUS_CHECK, STATUS_AUTOMERGE, STATUS_REBASE`

**adherence check**: the blueprint outputs `STATUS_REBASE` as a separate status variable.

**resolution**: this is a MINOR GAP.

**what the gap is**: the contracts section (lines 138-149) does not include `{rebase_status}` in the output shape. the codepath tree correctly outputs `STATUS_REBASE`, so the implementation will handle it. the gap is documentation, not design.

**why the gap is minor**: the codepath declares `STATUS_REBASE` as an output (line 51). `get_one_transport_status()` returns it. `emit_transport_status()` receives it as input. the implementation path is complete. only the contracts section example omits it.

**how to fix**: add optional rebase status to contracts:
```
🌊 release: {title}
   ├─ {check_status}
   ├─ {rebase_status}?  # optional, only if needs rebase
   ├─ {automerge_status}
   └─ {hint or watch}
```

**severity**: low — does not block implementation, only documentation.

---

## criteria contracts → blueprint adherence

### criteria: emit_transport_watch shows 3+ cycles

**criteria declares** (2.3.criteria.blueprint.md): "shows at least 3 poll cycles when inflight"

**blueprint declares**:
- codepath line 61: "at least 3 when inflight"
- contracts line 153-157: shows 3 poll lines explicitly
- test coverage line 111: "3+ poll cycles each"

**adherence check**: exact match. the blueprint adheres to the criteria at three levels.

**why this holds**: the criteria's "at least 3 poll cycles" appears verbatim in:
1. codepath comment (line 61): "at least 3 when inflight" — implementation knows the constraint
2. contracts example (lines 153-157): shows 3 `💤` lines — visual demonstration of shape
3. test coverage (line 111): "3+ poll cycles each" — tests enforce it

three-level coverage means: the implementer sees the constraint, the reader sees the shape, the tests prevent regression. this is defense-in-depth for the mandate.

---

### criteria: get_one_automerge_status as separate function

**criteria declares** (2.3.criteria.blueprint.md):
```
get_one_automerge_status contract
  then('exposes: (input: { of: transport }) => unfound|found|added|merged')
```

**blueprint declares**: no separate `get_one_automerge_status()` function. STATUS_AUTOMERGE is returned as part of `get_one_transport_status()`.

**adherence check**: INTENTIONAL DEVIATION.

**why this deviation is acceptable**: the criteria blueprint is a design sketch. the product blueprint can adjust internal boundaries as long as behavior is preserved. three reasons justify this choice:

1. **co-query**: automerge status and check status are always queried together. no use case queries automerge alone. a separate function would add a call with no benefit.

2. **contextual "added" state**: the "added" state means "automerge was just enabled by this invocation". `get_one_automerge_status()` would need to know if this is post-apply context, which couples it to caller state. embedding in `emit_transport_status()` keeps that context local.

3. **return semantics preserved**: the criteria's contract values (unfound|found|added|merged) are all supported. STATUS_AUTOMERGE can be any of these four. the criteria cares about the semantics, not the function boundary.

the previous review (r6: has-consistent-conventions) concluded: "different implementation, same behavior." this review confirms that conclusion.

---

## issues found

### issue 1: rebase status not in contracts section (minor)

**location**: blueprint contracts section (lines 138-149)

**problem**: the contracts section shows the output shape but omits the optional `{rebase_status}` line that appears in vision usecase 7.

**impact**: documentation gap only. the codepath tree correctly outputs `STATUS_REBASE`.

**resolution**: add optional rebase status to contracts section.

---

## issues NOT found (and why they hold)

### why output shape adherence holds

the blueprint reproduces the vision's output shape character-for-character in the contracts section.

**deeper reasoning**: i verified this by:
1. reading vision lines 61-65 which declare the exact emoji prefixes (`👌`, `🐢`, `⚓`, `🌴`)
2. reading blueprint lines 140-149 which quote these exact strings
3. confirming the tree structure matches: header → check → automerge → hint

the blueprint uses abstraction (`{check_status}`) but defines the concrete values. this is not deviation; it's parameterization. the `where:` clause binds variables to exact strings. when `emit_transport_status()` runs, it will emit one of the defined strings verbatim.

an alternative design would inline the strings without abstraction. the blueprint's approach is better because:
- the shape structure is visible (header, three branches)
- the value options are listed (clear enumeration)
- the output.sh functions can reference the contract

### why flag interface adherence holds

the blueprint splits flags into goal-flags and behavior-flags.

**deeper reasoning**: the vision's flag table (lines 75-86) is a flat list. the blueprint organizes it into two functions based on semantic role:

- `get_one_goal_from_input()`: determines what to release (--from, --into)
- `get_all_flags_from_input()`: determines how to release (--watch, --apply, --retry, --dirty)

this split is valid because:
1. **order of evaluation**: you must know the goal before you can evaluate behavior. `--watch` on feature-branch differs from `--watch` on release-tag.
2. **naming convention**: goal flags follow `get_one_*` (single goal determined), behavior flags follow `get_all_*` (multiple flags parsed).
3. **no information lost**: every flag from the vision appears in exactly one function's output.

the split is internal architecture; the CLI interface is unchanged. a user types `rhx git.release --from main --apply` and the executable parses all flags. how they're organized internally is implementation detail.

### why watch cycle adherence holds

the blueprint shows 3 poll lines in the contracts section.

**deeper reasoning**: the wish (0.wish.md lines 85-90) mandates "at least 3 watch poll cycles". the vision (lines 131-134) shows 1 poll line as an example. the blueprint followed wish over vision because:

1. **wish is normative**: the wish expresses intent ("MUST actually show 3 mock 'polls'")
2. **vision is interpretive**: the vision translates wish to user experience; the 1-poll example was illustrative
3. **when they conflict, wish wins**: the wish is the source of truth for requirements

the blueprint embeds this at three levels (codepath, contracts, test coverage) to ensure the mandate is visible to implementer, reviewer, and test framework. this triple-redundancy prevents accidental regression.

### why automerge function deviation is acceptable

the criteria envisioned `get_one_automerge_status()` as separate. the blueprint combines it into `get_one_transport_status()`.

**deeper reasoning**: this is acceptable because:

1. **semantic contract preserved**: the return values (unfound|found|added|merged) are all supported in STATUS_AUTOMERGE. what changes is where the value is computed, not what values are possible.

2. **"added" is contextual**: "added" means "this invocation enabled automerge". detecting "added" requires knowing: (a) automerge was unfound before, (b) --apply was requested, (c) enable_automerge() succeeded. this context lives in `emit_transport_status()` which orchestrates the apply. a separate `get_one_automerge_status()` would need this context passed in, adding coupling.

3. **no isolated use case**: the criteria shows no scenario where automerge status is queried without check status. they're always displayed together in the `🌊 release:` block. bundling them in one function reflects their usage pattern.

the criteria blueprint is a design hypothesis. the product blueprint is the refined design. deviations that preserve behavior are valid refinements.

---

## summary

| aspect | adherence | notes |
|--------|-----------|-------|
| output shape | ✅ exact | character-for-character match, verified by line comparison |
| flag interface | ✅ full | all 10 flags traced to blueprint functions |
| watch cycles | ✅ correct | wish mandate takes precedence over vision example |
| error states | ✅ covered | unfound handled separately, correct semantic |
| transition outputs | ✅ implicit | belongs in main flow, not output.sh |
| automerge function | ⚠️ intentional | behavior preserved, boundary simplified |
| rebase in contracts | ⚠️ minor gap | codepath correct, contracts incomplete |

**1 minor gap found**: rebase status not documented in contracts section.

**0 deviations that break behavior**: all intentional deviations preserve the declared behavior.

**conclusion**: the blueprint adheres to the behavior declaration. the minor gap (rebase contracts) should be fixed but does not block.

