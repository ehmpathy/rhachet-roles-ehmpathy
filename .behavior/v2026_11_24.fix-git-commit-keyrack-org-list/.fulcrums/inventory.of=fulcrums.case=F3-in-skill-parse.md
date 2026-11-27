# F3 — how the skill parses `org:`

## .fork
- (a) a bash/awk reader over a closed grammar: scalar (bare or quoted, with an end-of-line comment), one-line flow list, block list of `- x` lines
- (b) node + the `yaml` package
- (c) ask keyrack for the org list

## .taken
(a). `yaml` is a devDependency here, so a consumer install cannot load it (b). no keyrack command emits the org list (searched `rhachet/dist/contract/cli/invokeKeyrack.js`), so (c) needs an upstream change. the extant reader already chose "no yq dependency" (`git.commit.operations.sh:1971`). any shape outside the grammar refuses, so (a) never guesses.

## .rework
clean: one function.

## .confidence 90%
a valid yaml shape outside the grammar (e.g. a flow list across lines) refuses where keyrack accepts. the refusal names the shape, so the human rewrites one line.

## .verdict
best-guessed
