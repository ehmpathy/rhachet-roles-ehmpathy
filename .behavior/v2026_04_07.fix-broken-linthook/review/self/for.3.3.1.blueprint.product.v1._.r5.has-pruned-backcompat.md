# self-review: has-pruned-backcompat

## backwards compatibility scan

this is a new skill. scanned for backwards compat concerns.

### potential concerns

#### 1. old onStop lint hook

**current behavior**: `pnpm run --if-present fix` runs, but no lint check enforces exit code 2.

**new behavior**: adds `rhx git.repo.test --what lint` after fix hook.

**backwards compat needed?**: no. the wish explicitly wants to change this behavior. the old behavior is the problem.

#### 2. extant .log directories

**concern**: what if `.log/` directory already exists with different structure?

**analysis**: the skill findserts the directory. if it exists, findsert is a no-op. if .gitignore exists with same content, findsert is a no-op. no conflict.

**backwards compat needed?**: no. findsert semantics handle this.

#### 3. extant permissions

**concern**: what if user has custom permission settings?

**analysis**: the skill adds new permissions. does not modify old ones. additive change, not a break.

**backwards compat needed?**: no. additive, not a break.

### explicit backwards compat requests

scanned wish and vision for backwards compat requests:

- "our current onStop lint hook is a bit jank" - wants to replace, not maintain
- "instead" - indicates replacement, not addition
- no mention of "maintain", "backwards", "compatible", or similar

## verdict

no backwards compatibility was requested. this is a replacement, not a migration. no backwards compat concerns to prune.
