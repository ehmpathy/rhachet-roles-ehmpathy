# F7: the `.husky/*` concerns are out of this wish's scope

- fork: fix the review's concerns on `.husky/check.secrets.sh`, `.husky/check.timestamps.lock.sh`, `.husky/check.timestamps.sh` in this route, or leave them to their own work
- taken: leave them. this route did not write them: they were uncommitted in the worktree when the route began (`git status` shows `?? .husky/check.secrets.sh`, `?? .husky/check.timestamps.lock.sh`, ` M .husky/check.timestamps.sh`, ` M .husky/pre-commit`, beside other pre-route edits such as `package.json` and `boot.yml`). the review lanes read `--diffs since-main`, which sweeps in every uncommitted file, not only this wish's. the wish names git.repo.test alone
- the files are not hand-written here at all: they are rendered by the practice package. `diff node_modules/declapract-typescript-ehmpathy/dist/practices/husky/best-practice/.husky/check.secrets.sh .husky/check.secrets.sh` is empty; `check.timestamps.lock.sh` differs only in `TIMESTAMPS_LOCK_EXPECTED='__EXPECTED_BLOB__'` (the template slot). a local fix would be overwritten by the next `declapract apply` and fail the practice's check; the fix belongs upstream in `ehmpathy/declapract-typescript-ehmpathy`
- the concerns are real and one is serious (`check.secrets.sh` fails open when a shape regex errors: the scan pipeline has no `pipefail`). they are caught as a dream and named to the human; this route's commit will stage only its own files
- rework: clean. no file of this route touches `.husky/`
- confidence: 90%
- where: `.husky/check.secrets.sh:47-48`, `.husky/check.timestamps.lock.sh:17,43,50-51`
- verdict: open
