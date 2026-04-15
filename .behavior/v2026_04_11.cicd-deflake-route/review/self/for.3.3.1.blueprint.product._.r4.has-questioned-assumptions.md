# self-review r4: has-questioned-assumptions

## verification

examined blueprint for hidden technical assumptions. questioned each from fresh perspective.

---

## assumption 1: route location is `.behavior/`

**what we assume**: cicd.deflake route goes in `.behavior/v{date}.cicd-deflake/`

**what if the opposite were true?**: what if routes should go in `.route/` like declapract.upgrade?

**evidence**:
- vision example shows `.behavior/v2026_04_11.cicd-deflake/`
- declapract.upgrade uses `.route/v{date}.declapract.upgrade/`
- the distinction: `.behavior/` is for behavior-driven routes, `.route/` is for workflow routes
- cicd.deflake is a structured workflow → `.route/` would also work

**verdict**: this is specified in vision. the choice between `.behavior/` and `.route/` is wisher preference, not a bug. **assumption is acceptable.**

---

## assumption 2: subcommand pattern (init, help)

**what we assume**: skill uses subcommand dispatch like declapract.upgrade

**what if the opposite were true?**: what if skill was single-purpose (no subcommands)?

**evidence**:
- declapract.upgrade has `init` and `exec` subcommands
- cicd.deflake only needs `init` — there is no `exec` (brain drives the route)
- could we just have `rhx cicd.deflake` without subcommands?

**analysis**:
- if no subcommands, `rhx cicd.deflake` would = init
- but vision explicitly shows `rhx cicd.deflake init`
- and help subcommand is standard CLI contract

**verdict**: subcommand pattern is specified in vision. **assumption is acceptable.**

---

## assumption 3: route path uses ISO date

**what we assume**: route path is `v{YYYY_MM_DD}.cicd-deflake`

**what if the opposite were true?**: what if we used branch name or uuid?

**evidence**:
- declapract.upgrade uses same pattern: `v{YYYY_MM_DD}.declapract.upgrade`
- ISO date provides:
  - sortable folder names
  - clear temporal context
  - human-readable
- branch name would collide if same branch has multiple deflake cycles
- uuid would be less readable

**verdict**: ISO date pattern is established in extant skills. **assumption is acceptable.**

---

## assumption 4: 7 stones + 4 guards structure

**what we assume**: exactly 7 stones and 4 guards

**what if the opposite were true?**: what if fewer stones (combine some) or more guards?

**evidence**:
- 7 stones trace directly to wish items 1-7
- could we combine stones?
  - evidence + diagnosis? no — diagnosis might need observability added, so they're distinct phases
  - plan + execution? no — plan review happens before execution
  - repairs + reflection? no — repairs is itemization, reflection is systemic lessons
- could we add more guards?
  - evidence guard? not required — evidence is just data gather
  - repairs guard? not required — repairs is documentation, no failure mode to guard
  - reflection guard? not required — reflection is documentation

**verdict**: structure matches wish exactly. **assumption is acceptable.**

---

## assumption 5: peer-review only on execution guard

**what we assume**: peer-review guard only on stone 4 (execution)

**what if the opposite were true?**: what if we needed peer-review on plan too?

**evidence**:
- wish says: "apply a peer-review guard to detect missed failfast or added failhides"
- failhides are in code, not in plan
- plan is prose; execution is code
- peer-review rules target code patterns (`.agent/repo=ehmpathy/role=mechanic/briefs/practices/code.{prod,test}/pitofsuccess.errors/rule.*.md`)

**verdict**: peer-review belongs on execution (code changes), not plan (prose). **assumption is acceptable.**

---

## assumption 6: rewind goes to stone 3 (plan), not stone 4 (execution)

**what we assume**: verification failure rewinds to plan, not execution

**what if the opposite were true?**: what if we should rewind to execution?

**evidence**:
- wish says: "if there are any flakes, set the route as rewound to stone 3"
- why plan and not execution?
  - if verification fails, the repair approach might be wrong
  - to rewind to execution would just re-apply the same approach
  - to rewind to plan forces reconsideration of the repair strategy

**verdict**: rewind to plan is explicit in wish. **assumption is acceptable.**

---

## assumption 7: SKIP_ROUTE_BIND env flag

**what we assume**: tests use `SKIP_ROUTE_BIND=1` to skip bind in isolated temp dirs

**what if the opposite were true?**: what if we should use mock rhx instead?

**evidence**:
- declapract.upgrade uses same pattern
- test research documented this as established pattern
- to mock rhx would require more complex test setup
- skip flag is simpler and well-understood

**analysis**: could we avoid the skip flag by have rhachet available in test env?
- temp dirs are isolated, no rhachet context
- skip flag is pragmatic solution

**verdict**: skip flag follows established pattern. **assumption is acceptable.**

---

## assumption 8: output.sh as separate file

**what we assume**: turtle vibes output functions live in output.sh

**what if the opposite were true?**: what if inlined in init.sh?

**evidence**:
- declapract.upgrade has separate output.sh
- separation of concerns: output format vs route creation
- if we inline:
  - init.sh grows larger
  - turtle vibes code mixed with route logic
  - harder to maintain

**verdict**: separation follows established pattern and improves maintainability. **assumption is acceptable.**

---

## assumption 9: templates are static files, not generated

**what we assume**: stones and guards are static template files copied to route

**what if the opposite were true?**: what if templates were generated dynamically?

**evidence**:
- declapract.upgrade uses static templates
- static templates are:
  - reviewable in PRs
  - version-controlled
  - simpler to understand
- dynamic generation would require:
  - more code
  - harder to review
  - more failure modes

**verdict**: static templates follow established pattern. **assumption is acceptable.**

---

## verdict

**examined 9 technical assumptions. all are acceptable.**

each assumption either:
1. traces to explicit wish/vision specification
2. follows established pattern from declapract.upgrade
3. has clear rationale when alternatives were considered

no hidden or unjustified assumptions found. the blueprint's technical choices are sound.
