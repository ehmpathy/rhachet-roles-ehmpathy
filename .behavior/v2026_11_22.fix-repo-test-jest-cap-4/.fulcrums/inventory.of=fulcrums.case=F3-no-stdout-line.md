# F3: no new stdout line

## .the fork
- **a.** print the worker choice in the run's tree (e.g. `├─ workers: 4 (shared box cap)`)
- **b.** print naught new; document the cap and the override in `--help`

## .taken
**b.** a workers line would differ by box. the skill's own integration tests spread `process.env` into the child, and github actions sets `CI=true`, so every apply-mode snapshot would differ between a grove and ci. the line would also be a default, not a result: the crew does not act on it. `--help` holds the cap, the ci rule, and the `-- --maxWorkers=N` override, so the behavior stays discoverable.

the bound of (b): it covers a clean cap decision only. two states do print, since each is a result the crew may act on: a lookup fault prints a `├─ workers: 💥 MalfunctionError: …` branch (both streams, `rule.require.skill-output-streams`), and a capped run past `--timeout` prints a `🥥` hint with the widen command.

## .rework
clean. one `print_tree_branch` line, plus a fixed `CI` in the test env and a resnap.

## .confidence
75%. an ergonomist may prefer the visible line; the cost is the test env change above.

## .where
`git.repo.test.sh` → `--help` text.

## .verdict
awaits wisher review.
