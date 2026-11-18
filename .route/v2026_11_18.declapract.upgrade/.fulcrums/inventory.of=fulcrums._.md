# fulcrums inventory

| case | title | rework | status | confidence |
|---|---|---|---|---|
| F1 | declare `"private": false` over the backfilled `true` | clean | best-guessed | 97% |
| F2 | self-dep `rhachet-roles-ehmpathy` as `link:.` | clean | best-guessed | 95% |
| F3 | keep `rhachet-artifact-git` in devDependencies, as the practice moved it | clean | best-guessed | 75% |
| F4 | keep the template role list, which drops `dreamer` | clean | best-guessed | 80% |
| F5 | replace `wrapper-fns` with local `withRetry` + `withTimeout` (prod-dep cycles) | clean | reverted — premise failed; cycles fixed in the deps (override + patch) | 30% |
