feat(git.package.patch): pave the pnpm patch lifecycle as one rhx verb

- add rhx git.package.patch set|get|del
- set opens an edit dir via pnpm patch, inside the tree only; the same set with --why + an http(s) --upstream seals it via pnpm patch-commit and writes a LOCAL PATCH note beside the patch
- the seal names every file it changes: the patch, the note, the manifest entry, pnpm-lock.yaml
- the seal sets allowUnusedPatches + ignorePatchFailures in pnpm-workspace.yaml, so an upgrade past a patched version lands, never fails the install
- set opens a pristine copy, then lays any committed patch onto it, so a reseal keeps the prior edits
- get always checks: each patch with its entry, why, upstream, who, and its trial-applied state; names each that is underapplied, obsolete, unused, unbacked, or unrecorded, with its repair; exit 2 if any
- del retires a patch's entry, file, and note, then reinstalls the pristine copy; a rerun is a no-op
- add a mechanic onStop hook that runs get --when hook.onStop: silent while every patch applies, a nudge with the repair once one is stale; never blocks the stop
- gate rhachet, rhachet-roles-bhrain, rhachet-roles-bhuild, rhachet-roles-ehmpathy: set refuses them, and names the upstream task and the human grant as the fix
- add git.package.patch.uses get|allow|block: a human-only meter (.meter/git.package.patch.uses.jsonc, gitignored) that admits a gated package with a why on record; a clone's allow is refused
- refuses an --edit-dir outside the tree (.., absolute, symlink escape, the live install), -g, and npm / yarn / bun repos
- refuses a node-linker=hoisted repo (.npmrc or pnpm-workspace.yaml) and points to #772
- plan by default, --mode apply writes
- pre-approved in mechanic permissions; raw pnpm patch / patch-commit redirect to the verb

review (uladkasach), addressed:
- "simplify to set/get/del, get always checks" — begin + commit fold into set (it seals when --why + --upstream are passed); check folds into get; the dispatcher reads set, get, del, help
- "rip out test.acceptance.prebuilt, fix the root in git.repo.test" — the twin skill and its test are removed; the root was the build, which now passes with introspect, so acceptance runs via the paved `rhx git.repo.test --what acceptance --against local --env test`
- "enrule to prevent sprawl, fix at root instead" — add mechanic `rule.forbid.twin-tool-sprawl`: a paved tool that fails is fixed at its root, never shadowed by a twin under a new name. its cue boots inside `rule.prefer.scouts-honor`, its full rule as a ref, so the mechanic boot stays under its 30k cap

issues:
- closes #926 — set, get, del, the onStop nudge, and the upgrade-safe install
- closes #1424 — the human meter and the gate, folded here
- refs #772 — its own scenario is a hoisted (expo / react-native) repo, which this verb refuses; #772 stays open for the hoisted path
- #1014 can close: the paved verb makes a raw `pnpm patch` allow unneeded

tasks read (#1400–#1429), folded or left:
- #1424 a human meter admits a gated package to an in-tree pnpm patch — **folded**: it changes this verb's design (a gate in set, a new `uses` meter, a pristine open plus the laid prior patch)
- #1429 git.commit.push stacked pr · #1427, #1425 git.commit.push --help — left: the push verb, not the patch verb
- #1428, #1406 declapract.upgrade — left: route templates and gates, no patch surface
- #1426, #1414, #1405, #1401 git.branch.rebase and its permission lift — left: rebase verb
- #1423, #1412 git.stage.add / git.stage.del — left: stage verbs
- #1422 sedreplace symlinks · #1403 mvsafe symlinks · #1400 rmsafe trash — left: file tools
- #1421, #1416, #1415, #1410, #1409 git.repo.test — left: test runner keys, bounds, workers
- #1420 github token source — left: github skills auth
- #1419 general git tools + a supplier/consumer architect rule — left: module and term tools from ahbode/infrastructure, and a declastruct dir rule; neither touches the patch verb
- #1418 git.release --into prod — left: release verb
- #1417 stale lock names, output caps — left: rebase lock and grepsafe output
- #1413, #1411 git.pull.watch daemons — left: watch verb
- #1408 a paved exec bit — left: already paved here as chmodsafe, used for the new verb
- #1407, #1404 git.repo.get --tree — left: repo read verb
- #1402 rhx git.ref.diff as a paved alternative — left: permissions for diff

the file `.dream/v2026_11_16.polish.git-package-patch-render-shapes.md` (also linked at `.behavior/v2026_10_20.feat-git-package-patch/dreams/`), cured against #1424 and the review:
- dropped "begin's malfunction has no 🥥 hint": set now prints a rerun hint on a pnpm failure, and a get hint when a prior patch no longer fits the pristine copy
- dropped "the dispatcher hint appends `(or: commit, help)`": the dispatcher now names `set, get, del, help` as its own line
- added that the #1424 renders (the gated refusal, the `uses` verb) already quote every placeholder (`'<why>'`, `'<title>'`), so the polish pass covers the older set and get renders only
- the `[t7]` run line now names `set`, the verb that replaced begin
- every other polish item stands as caught; neither #1424 nor the review touches them

the rhachet 1.50 bump and actor migration stay out of this pr (fulcrum F6)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
