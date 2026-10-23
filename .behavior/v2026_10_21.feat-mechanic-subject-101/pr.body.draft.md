feat(mechanic): add `subject.101` — the basics, capped at 10k

## what

`role=mechanic` gains `subject.101`: the eight rules an in-seat cure must meet that no hook
enforces, in cue form. a director seat that enrolls `mechanic::101` gets every mechanic hook (they
bind to the role, 0 boot tokens) plus these cues, without the full role's boot.

| say (cue form) | why a cure needs it |
|---|---|
| `rule.require.failfast` | a tool that limps past bad state reports a false green |
| `rule.require.failloud` | ConstraintError vs MalfunctionError tells the next clone: fix input, or retry |
| `rule.forbid.failhide` (pt1) | a catch-all hides the one signal a supervisor relies on |
| `rule.require.exit-code-semantics` | a wrong code fails a PreToolUse gate open |
| `rule.require.qualified-error-headers` | the PreToolUse exception: a hook malfunction still exits 2 |
| `rule.forbid.nonidempotent-mutations` | cures re-run on every wake, compact, retry |
| `rule.forbid.as-cast` | a cast hides the defect from tsc |
| `rule.require.clamp-edge-cases` | a fix owes a clamp that goes red without it |

args and demos ride at ref: failhide pt2, failfast seed + shell demo, idempotent-procedures, assure-via-type-checks, and `test-covered-repairs` — at ref so 101 does not
upgrade it in the full role (`subject.flow` holds it at ref), and `clamp-edge-cases` already demands
the test it requires.

## cost

| measure | tokens |
|---|---|
| `subject.101` section alone — the clamp, `boot.budget.integration.test.ts` | **≈ 2.9k / 10,000** |
| `npx rhachet roles cost --repo ehmpathy --role mechanic --subject 101` | **12,421** |
| full role | 27,758 → 27,913 (+155) |
| `subject.code.prod` · `code.test` · `flow` · `arch` | unchanged |

**why `--subject 101` reads 12,421, over the 10k cap:** rhachet unions `always` into every
subject (`computeBootPlan.js:203`) and refuses a `budget:` inside a section
(`parseRoleBootYaml.js:31-32`). so the cap lives in the test, which costs the 101 section with
`always` emptied, via rhachet's own measure. the rhachet half — `role::subject` enroll, a
per-subject `always` opt-out, a per-subject budget — is inflight in crew
`rhachet.beav.feat-enroll-role-subject-focus`. once it ships, the cap moves into boot.yml as
`budget:` and `--subject 101` reads the slice direct.

**why the full role reads +155, and why it returns to 0 upstream:** every 101 row already sat in
the role, and the full boot emits no new brief body (98 say batches with or without 101). all +155
is ref-roster text: rhachet lists a say row's second claim in the roster even on an identical path
(+118), and lists a ref by plain `.md` where the say emits `.min` (+37). no edit here reaches 0 with
101 intact — rows named by `.md.min` make rhachet boot naught for them. the render fix is
dispatched to the rhachet tree (`feat-enroll-role-subject-focus`); once it lands the full role reads
27,758 with no change here.

## tests

- `boot.budget.integration.test.ts`: a `SUBJECT_BUDGETS` cap — `mechanic subject.101 ≤ 10_000`,
  costed on the section alone (`asBootSpecSlice` → `genOneSubjectSliceSpec` → `getOneBootCost`).
  on breach it throws `ConstraintError: subject.101 boots past its cap` with tokens, cap, and the
  levers (move a say row to ref, or condense to a `.min`). a second case judges a slice over its cap
  on fixed numbers, so ci proves the verdict bites; its message is snapped. logs the slice beside
  the union, and throws a named `ConstraintError` once the slice reaches the union — the signal that
  rhachet no longer unions `always`, so the cap moves into boot.yml.
- the same file boots the slice as a focused seat would (`roles boot --what <slice> --subject 101`):
  its say blocks are exactly the eight rows with no `always` brief, its ref roster exactly the six,
  no skill; the paths are snapped (paths only, so a brief edit leaves the snapshot intact).
- isolation: the same file costs the role with and without `subject.101`, each measured from its
  spec's own dir so paths match. every other subject costs exactly the same; the whole role grows
  +155, under one roster line per row (F7). a say upgrade (the F6 case) reads +695 and fails it.
- `blackbox/mechanic.subject.101.acceptance.test.ts` walks the built package as a consumer links
  it: `roles boot --subject 101` (every 101 say row emits; say paths snapped), `roles cost
  --subject 101` (readout snapped, counts masked), the `/tmp` hook block (exit 2, fix named), and
  `--role mechanic::101` today (exit 2, no partial mechanic).
- every error path in that file is exercised and snapped: the breach, a stale subject row, a stale
  role row, and `roles cost` format drift (`MalfunctionError`; a `null` budget only where rhachet
  prints `none declared`).
- `boot.yml.integration.test.ts`: pins `subject.101` to its exact eight say and six ref rows, no
  skills — a dropped cue or a stray overlay fails ci. a second clamp: 101 may not say a brief
  another section holds at ref, so it cannot upgrade a ref in the full role (proven red → green).
  a third: every section and every curation uses only keys rhachet reads (`briefs`/`skills`;
  `say`/`ref`/`not`) — rhachet strips an unknown key in silence, and a typo'd `say:` reads as "say
  all". a fourth: no row in any section names a `.min` path. a fifth boots `--subject 101` and
  checks every say row emits as a `<brief.say>` — rhachet drops a row it cannot boot with no error,
  so the yaml alone proves naught.

## deviations from the wish

- `test-covered-repairs` sits at **ref**, not say (wish item 3). a say row upgrades the flow
  subject's ref in the full role, which item 5 forbids. its cue lives in `clamp-edge-cases`, at say.
  ruled B by the wisher (F6).
- `qualified-error-headers` joined **say** (not in the wish): it holds the PreToolUse exception — a
  malfunction in a hook still exits 2, else the gate fails open. code.prod already says it, so the
  full role is unchanged (F10).
- `rule.require.failfast.[demo].shell.md` (a ref row in 101 and code.prod) now models the say cue it
  backs: `✋ ConstraintError` / `💥 MalfunctionError`, each error to stdout and stderr, no `/tmp`,
  no `elif`. a ref row boots as a path, so the full role's boot is unchanged (27,913).

## today, before the rhachet half ships

no seat gains from `subject.101` yet: rhachet has no `role::subject` enroll. today
`roles boot --role 'mechanic::101'` exits 2 with "no role found" (the slug is read literally), and
with `--if-present` it skips in silence — so an early `mechanic::101` request errors or yields no
mechanic at all, never a partial one. this pr lays the slice and its cap so the rhachet half lands
onto a tested contract.

## route notes

- 1.vision peer lanes pinned to `--brain openrouter/z-ai/flash`, off the OpenInference host that
  returned 400 (granted, one repair). the 400 itself is rhachet-ktlo's lane.
- **retire the openrouter patch:** the 400 cleared — 5.1's lanes rendered on the default
  `openrouter/deepseek/flash` with no guard edit. drop the `--brain openrouter/z-ai/flash` pin and
  its comment from `1.vision.guard` in a follow-up, under a route mutate grant.
- **before merge — swap the rhachet git pin:** `rhachet` is pinned to `github:ehmpathy/rhachet#main`
  (lockfile `1d747fd`) so the l3 review lanes run on #636. it swaps to `v1.50.1` the moment that
  release lands: `rhx set.package.upgrade --package rhachet --to 1.50.1`. no figure here moves.
- route: `.behavior/v2026_10_21.feat-mechanic-subject-101`.

closes ehmpathy/rhachet-roles-ehmpathy#1041

🤖 Generated with [Claude Code](https://claude.com/claude-code)
