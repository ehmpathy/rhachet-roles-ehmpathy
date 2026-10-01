# ✅ resolved 2026-09-21 — review lanes dark; the binds were too wide

## .the halt

at i009 all 11 review lanes on stone 5.1 returned `💥 malfunction: review timed out after 21
minutes`. the deliverable was green; the wall was review scope. the remedy — narrow each lane's bind
in the guard — needed `route.mutate`, which a human granted.

## .the cause

the execution guard declared narrow artifacts:

```
artifacts:
  - $route/5.1.execution.from_vision.yield.md
  - src/**/*
```

but bound every lane with `--paths-with '**/*.{ts,sh,md,snap}'`. the `md` pulled in the vision
stone's approved output on every round:

| file | size | this stone's artifact? |
|---|---|---|
| `1.vision.experience.case=_.md` | 89 KB | no — vision stone, approved |
| `grepsafe.integration.test.ts` | 63 KB | yes |
| `1.vision.yield.md` | 49 KB | no |
| `5.1.execution.from_vision.yield.md` | 36 KB | yes |
| `grepsafe.sh` | 25 KB | yes |
| `0.wish.md`, fulcrums, experience cases, dreams | the rest | mostly no |

the largest file in every review for nine rounds belonged to a stone already approved.

## .the diagnosis first escalated was two-thirds wrong

| claim in the escalation | measured after the grant |
|---|---|
| `pnpm-lock.yaml` (329 KB) was ~36% of scope | false — `.yaml` was never in the bind |
| the `.taken` files pushed the lanes over | false — `.reviews/peer/.gitignore` holds `*`, and the enumerator honors `--exclude-standard` |
| the lanes ran wide, not slow | true, for the reason above |

the brief that warned of a dropped extension brace in `parseReviewArgs` was also stale: `paths-with`
is repeatable, unknown flags fail loud, and globby handles the brace.

every corrected claim was measurable at i001 with commands at hand. a right ask reached through
false premises is luck, not diagnosis (`rule.require.trust-but-verify`).

## .the repair

```
- --paths-with '**/*.{ts,sh,md,snap}'
+ --paths-with 'src/**/*' --paths-with '.behavior/…/5.1.execution.from_vision.yield.md'
```

all 9 lanes in `5.1.execution.from_vision.guard`; the vision and verification guards untouched.
`mech-decode-friction`'s `--paths-without '**/*.test.ts'` stays. the bind now matches the artifacts
the guard declares.

one near-miss: the first replace glob, `.behavior/**/*.guard`, reached 110 files across other routes'
guards. plan mode caught it, and the replace was scoped to this route.

## .levers weighed and refused

- a hand-run `rhx review` — forbidden (`rule.forbid.hand-run-reviews`)
- a commit to collapse `since-main` — no stone asked for one
- revert `pnpm-lock.yaml` — in-flight work, not this stone's
- self-grant `route.mutate` — the flag was writable, but the seal keeps the reviewed party from the
  criteria it is graded against; writable is not authorized
- more budget — not the wall; a timeout is not exhaustion
