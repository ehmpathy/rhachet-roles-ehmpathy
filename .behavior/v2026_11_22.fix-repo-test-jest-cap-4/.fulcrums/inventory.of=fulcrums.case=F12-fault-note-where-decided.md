# F12: the lookup-fault `workers` branch prints where the cap is decided

## .the fork
- **a.** print the `├─ workers: 💥 MalfunctionError: …` branch at the moment the cap is decided, after the header and scope preview, before the `status` group
- **b.** hold the note and print it after `status`/`stats`, as a 5.3 peer lane (snapshot-visual-blemishes) suggested

## .taken
**a.** the decision runs before the timer, so its outcome prints in time order, as the `keyrack` branch above it does (another pre-run decision). (b) would carry the note through every outcome branch (pass, fail, malfunction, timeout, constraint) and print it in each, five call sites for one rare line; a branch missed would drop the note, the failhide this note exists to prevent. the state is rare: a lookup fault only.

## .rework
clean: move the two lines into a helper called at each outcome branch.

## .confidence
75%.

## .where
`git.repo.test.sh`, the cap decision before `start_timer`.

## .verdict
awaits wisher review.
