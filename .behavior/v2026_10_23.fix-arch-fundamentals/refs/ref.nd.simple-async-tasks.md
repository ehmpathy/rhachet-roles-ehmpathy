# ref.nd.simple-async-tasks

grade: ✅ — our own package, read from its repo
cite: ehmpathy. simple-async-tasks, readme.md. https://github.com/ehmpathy/simple-async-tasks
seen: `rhx git.repo.get lines --in ehmpathy/simple-async-tasks --paths 'readme.md'` (local clone, ref origin/main) — fetched 2026-11-26

## .quotes

> "easily create and use async-tasks within a pit-of-success"

> "public static unique = ['endpoint', 'payload'];" (the task is a `DomainEntity` with a natural key)

> "***⚠️ note: you must change the status of the task away from attempted by the time the execute function resolves to some non-attempted , otherwise it will be considered a failure***"

## .supports

- `catalog.of=pattern.transaction.bound=contract.trait=atomicity.pattern=async-task` — the task as a domain entity with a unique key; the queue and execute lifecycle wrappers (`withAsyncTaskExecutionLifecycleQueue`, `withAsyncTaskExecutionLifecycleExecute`); an execute that ends in `ATTEMPTED` counts as a failure
