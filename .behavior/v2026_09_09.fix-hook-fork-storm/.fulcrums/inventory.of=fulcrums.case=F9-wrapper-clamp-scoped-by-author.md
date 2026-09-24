# F9 — the "no wrapper" clamp is scoped to this role, by `author`

- **rework** = clean
- **status** = open
- **confidence** = 90%
- **called** = 2026-09-10, at execution, after a read of the generated `.claude/settings.json`

## .the cue that fired

lever B swapped all 14 mechanic hook commands to `bash <ported path>`. the clamp written
beside it — *"no registered hook reaches through the rhachet run wrapper"* — reads the
generated `.claude/settings.json`, and that file carries hooks from **eight** role
packages, not one:

```
bhrain/driver · bhrain/reviewer · bhuild/behaver · bhuild/dispatcher
bhuild/dreamer · ehmpathy/architect · ehmpathy/ergonomist · ehmpathy/mechanic
```

seven of those eight live in other repos. their hooks still use the wrapper, correctly —
no drive here can change them.

## .the fork, stated fairly

| | assert on ALL registered hooks | assert on the mechanic's own |
|---|---|---|
| what it catches | any wrapper anywhere in the config | a wrapper restored on **this** role |
| what it does | 🔴 **fails today, with no fix available in this repo** — it would demand seven other repos change before this one is green | passes, and goes red the moment a mechanic hook regresses |
| how it fails | on work we are not permitted to do ⇒ the clamp gets weakened or deleted by whoever hits it next | on the exact regression it was written for |

## .taken, and why at the time

**scope it by `author === 'repo=ehmpathy/role=mechanic'`.**

1. **a clamp must fail on a defect its owner can fix.** an assertion that stays red until
   seven unrelated repos ship is an assertion that will be deleted, and a deleted clamp
   guards no one. ⇒ it would trade a real guard for a symbolic one.
2. **`author` is already carried in the generated config**, one field per hook, emitted by
   rhachet itself — so the scope is read from the data rather than re-derived from a path
   pattern that could drift.
3. **the regression this exists to catch is local**: a re-stamp from a template, or a hook
   row copied from another role, restoring the wrapper on a mechanic hook. that is exactly
   what the scoped form catches.

## ⚠️ .what it gives up, stated rather than hidden

**it cannot see a wrapper restored on another role's hook.** if `bhuild/behaver` later
adopts the wrapperless shape and then regresses, this clamp is silent about it.

⇒ that is the correct boundary — each role package should carry its own clamp, which is
precisely the lesson dispatched to `rhachet-roles-rhachet`'s enroller role this round. the
clamp here guards what this repo owns.

## 🔴 .the trap this call already sprang once

the first draft of both clamps tested `command.includes('rhachet run --init')`. **that
substring matches no command that has ever existed** — the real form is
`rhachet run --repo X --role Y --init Z`, so `run` and `--init` are never adjacent.

⇒ the assertion passed **vacuously**, green on a config that still held 14 wrappers. it
was caught only because the clamp was deliberately run against the un-regenerated config
to watch it go red — and it stayed green. **a clamp not seen to fail is a guess**
(`rule.require.clamp-edge-cases`).

the fix is two `includes` joined by `&&`, and a `.note` on both copies that says why the
naive form is wrong, so the next author does not re-collapse it.

## .rework, and why

**clean.** one filter predicate in one test. to widen the scope later is a line change,
and no later work builds on the narrow form.

## .confidence, and why it is not higher

**90%.** the reasoning is sound and the alternative is plainly unworkable today. what
holds it under 93 is that it is a **judgment about what a clamp is for** — a reviewer who
weighs completeness above actionability would widen it and accept a red suite as a standing
signal. that is a defensible position; it is not the one taken here.

## .where

- `src/domain.roles/mechanic/inits/claude.hooks/pretooluse.forbid-terms.forkbudget.integration.test.ts` — `[case4] [t0]`
- `src/domain.roles/mechanic/getMechanicRole.test.ts` — `[t3]`, which needs no scope: its
  subject is the mechanic role object itself

## .the verdict

*(open — awaits the council)*
