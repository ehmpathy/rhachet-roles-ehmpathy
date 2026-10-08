# F23 — two i007 nitpicks are false positives, disputed with evidence

- **fork:** change code to satisfy each nitpick, or dispute it with evidence.
- **taken:** dispute both. neither names a defect that a change would remove.
  1. `arch-hazards-maintenance` nitpick.2 — `asJsonFromJsonc` "rewrites a value that ends in `,`".
     the replace runs only when the scan meets `}` or `]` outside a string, and `/,(\s*)$/` is
     anchored to the end of the accumulated output. so it matches only a comma (plus whitespace)
     directly before that close bracket. a string value that ends in `,` leaves the output ended
     by its final `"`, which cannot match. the review also misread `\s` as "whitespace+tab".
  2. `ergo-friction-hazards` nitpick.1 — "no committed `.snap` for the new acceptance suites".
     both files exist: `blackbox/__snapshots__/pretooluse.check-permissions.acceptance.test.ts.snap`
     (staged) and `blackbox/__snapshots__/permissions.get.acceptance.test.ts.snap`. the lane's
     scope bound held `blackbox/**/*.ts` but no `blackbox/**/*.snap`, so it could not see them. the
     guard now adds `--paths-with 'blackbox/**/*.snap'` (a lens repair, under the wisher's grant),
     so the next round reads them.
- **rework:** clean — each is a small edit if the council rules otherwise.
- **confidence:** 90% — both are checkable against the files.
- **where:** `pretooluse.check-permissions.integration.test.ts` (`asJsonFromJsonc`),
  `blackbox/__snapshots__/`, `5.1.execution.from_vision.guard`.
- **verdict:** —
