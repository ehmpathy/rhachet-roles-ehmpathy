# howto.git-pull-watch

## .what

the pr watch tells a clone, on its own, when a trusted human's review comment awaits its reply, its pr's ci fails, a new comment lands, the pr is approved, or the pr ends. no human relays it.

- armed by `rhx git.commit.push --mode apply` (and `git.commit.set --push`), or by hand: `rhx git.pull.watch set --which <n> --mode apply`
- one daemon per machine per version key serves every clone on the box; a second `set` finds it, never spawns a twin
- the session-start hook brings a dead daemon back for each watch this clone holds, under any key

## .each alert → its act

| alert | next line names | your act |
|---|---|---|
| `reply task on #<n>` (or `N reply tasks`) | `rhx git.pull.comment set … --reply-to <root> --key answer-<id> --from <file\|@stdin> --mode apply` | reply first, in two lines: what you will change, or why it holds; then resume. the text is there whole, so no read is owed. keep the key as printed: it ends in your clone's tail, so a peer clone never overwrites your answer; an `edited` task adds `-e<print>`, since an edit sends no notice and its answer must land as a fresh reply |
| a reply task marked `held … check each thread first` | the same | read the thread first: a relay or the web may have answered it already |
| (your own act) a fix lands for a thread you answered | — | reply again in the thread under a fresh key: the printed key plus `-done` (e.g. `--key answer-5001-ca1a1a1a-done`), so it posts and notifies. a rerun under the printed key edits your first answer in place, and an edit sends no notice |
| `ci failed on #<n>` | `rhx show.gh.test.errors` | read the errors, fix at cause, push |
| `new comment on #<n>` | `rhx git.pull.comment get --which <n> --in <repo>` | a top-level comment, a peer clone's note, or a review comment by a human the repo does not trust: read it; reply in its thread via `rhx git.pull.comment set` where one is owed |
| `approved #<n>`, ci passed | `rhx git.release --mode apply` | release only on an explicit human order (`rule.require.git-release-confidence`) |
| `approved #<n>`, ci failed | `rhx show.gh.test.errors` | fix ci first |
| `approved #<n>`, ci not done | `rhx git.release --watch` | watch ci to its end |
| `#<n> merged; watch ended` | — | naught; the watch ends itself |
| `#<n> closed without merge; watch ended` | — | ask the human why, if unclear |

## .the token

- the daemon reads github with keyrack `ehmpathy.prep.EHMPATHY_SEATURTLE_GITHUB_TOKEN`
- where that key is absent, locked, or blocked, it reads the grove token `@all.prep.GITHUB_TOKEN`
- never the human gh login
- neither granted → the watch is `paused`; the alert names the fix:
  - `rhx keyrack unlock --owner ehmpath --env prep --key EHMPATHY_SEATURTLE_GITHUB_TOKEN`
  - or, for the whole grove: `rhx keyrack set --owner ehmpath --org @all --env prep --key GITHUB_TOKEN`
- cursors hold while paused; alerts resume at the next tick after the unlock

## .held and outage

- **held** — `clone say` refused the alert (the clone was busy or deaf). the daemon retries each tick, and the clone hears it at its next prompt (the prompt hook prints each held alert, oldest first). a late alert reads `(held N ticks; you were busy)`
- **outage** — github gave no answer for a while. the note reads `github unreachable for N min`; naught to do, cursors hold

## .see and stop

- `rhx git.pull.watch get` — every daemon on the box, its state, and each watch. a held row reads `· N held, T ticks: <cause>`
- `rhx git.pull.watch del --which <n> --mode apply` — stop this clone's watch on a pr (plan by default)

## .the watch and the release watch

the watch alerts on ci of the pr in the background. `rule.require.watch-release-after-push` still asks you to run `rhx git.release --watch` after each push; the watch does not replace it.
