# F4: on ci, the repo config governs

## .the fork
- **a.** on ci the skill adds no worker flag; the repo's jest config decides (`'50%'` in 195 of 198 ehmpathy configs)
- **b.** on ci the skill passes `--maxWorkers=100%` so the suite uses literally every core

## .taken
**a.** the wish's outcome line reads "the cap does not apply" — that is the contract. "uses every core" gives the reason (the runner is dedicated). `'50%'` is a deliberate repo choice, with a cited reason in each config (`jest.unit.config.ts:45`). an override on ci would be a second decision the wish did not ask for, and would make the skill's ci run differ from `npm run test:unit` on the same runner.

## .rework
clean. one flag on the ci branch.

## .confidence
80%. the wisher may have meant literal 100%.

## .where
`git.repo.test.sh`, the ci branch of the worker decision.

## .verdict
the vision that carries this choice was approved by the director (`1.vision` judge.2 allowed). a literal 100% on ci would also override the speed choice each config cites (`maxWorkers: '50%'`, with a link on why jest runs faster at 50%).
