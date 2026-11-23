# F5: the explicit count rides the `--` passthrough

## .the fork
- **a.** the caller states a count the way jest already accepts it: `rhx git.repo.test … -- --maxWorkers=N` (or `-w N`, `--runInBand`, `-i`)
- **b.** a new skill flag, e.g. `--workers N`, that the skill maps to `--maxWorkers=N`
- **c.** an env var, e.g. `GIT_REPO_TEST_WORKERS=N`

## .taken
**a.** the wish says "an explicit worker count from the caller", and names no surface. `-- <jest args>` already reaches jest (`git.repo.test.sh:1238`), so a caller who knows jest needs no new word. a new flag would add a second name for one concept (`--workers` vs `--maxWorkers`), which `rule.forbid.domain-term-synonyms` warns against. an env var is invisible at the call site.

## .rework
clean. a flag (b) is one `case` arm plus a help line, and can sit beside (a) later.

## .confidence
80%. the wisher may want a first-class flag for discoverability.

## .where
`git.repo.test.sh` arg parse (line 555) and `--help` (line 629).

## .verdict
awaits wisher review.
