# F13: the real-jest cases assert counts; they do not snap a tree

## .the fork
- **a.** workers [case13] and [case14] assert what real jest resolved: `"maxWorkers": 4,` from `--showConfig`, and the count of distinct `JEST_WORKER_ID`s. The run tree is pinned by the fake-npm snaps
- **b.** also snap a masked stdout tree from each real-jest run, as a 5.3 peer lane (snapshot-coverage) suggested

## .taken
**a.** [case13] passes `-- --showConfig`, so jest prints its config and runs no tests. Its tree is no run tree a crew sees, and a snap of it would pin jest's own dump. [case14] runs crews in parallel with `stdio: 'ignore'`; its proof is the worker-id count, which a snap cannot state. The cap's tree is the same tree an uncapped run prints (F3), and the fake-npm cases [case1]–[case5], [case11] and [case12] snap it on both streams.

## .rework
clean: add `then('stdout matches snapshot')` to one real-jest case with a full run (no `--showConfig`), masked by `asStableOutput`.

## .confidence
80%.

## .where
`git.repo.test.workers.integration.test.ts`, [case13] and [case14].

## .verdict
awaits wisher review.
