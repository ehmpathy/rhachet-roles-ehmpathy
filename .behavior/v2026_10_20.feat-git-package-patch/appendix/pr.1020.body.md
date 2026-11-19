feat(git.package.patch): pave the pnpm patch lifecycle as one rhx verb

- add rhx git.package.patch begin|commit: runs pnpm patch / patch-commit inside the tree only
- commit requires --why and an http(s) --upstream, writes a LOCAL PATCH note beside the patch
- commit names every file the seal changes: the patch, the note, the manifest entry, pnpm-lock.yaml
- commit sets allowUnusedPatches + ignorePatchFailures in pnpm-workspace.yaml, so an upgrade past a patched version lands, never fails the install
- add get: list each patch with its entry, apply state, why, upstream, who
- add check: trial-apply each patch against the installed tree; name each that is underapplied, obsolete, unused, unbacked, or unrecorded, with its repair; exit 2 if any
- add del: retire a patch's entry, file, and note, then reinstall the pristine copy; a rerun is a no-op
- add a mechanic onStop hook that runs check --when hook.onStop: silent while every patch applies, a nudge with the repair once one is stale; never blocks the stop
- refuses an --edit-dir outside the tree (.., absolute, symlink escape, the live install), -g, and npm / yarn / bun repos
- refuses a node-linker=hoisted repo (.npmrc or pnpm-workspace.yaml) and points to #772
- plan by default, --mode apply writes
- pre-approved in mechanic permissions; raw pnpm patch / patch-commit redirect to the verb

issues:
- closes #926 — begin, commit, get, check, del, the onStop nudge, and the upgrade-safe install
- refs #772 — its own scenario is a hoisted (expo / react-native) repo, which this verb refuses; #772 stays open for the hoisted path
- #1014 can close: the paved verb makes a raw `pnpm patch` allow unneeded

the rhachet 1.50 bump and actor migration stay out of this pr (fulcrum F6)
