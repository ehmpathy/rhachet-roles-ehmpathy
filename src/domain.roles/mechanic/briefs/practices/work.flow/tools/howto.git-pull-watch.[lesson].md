# howto.git-pull-watch

## .what

the pr watch tells a clone, on its own, when its pr's ci fails, a new comment lands, the pr is approved, or the pr ends. no human relays it.

- armed by `rhx git.commit.push --mode apply` (and `git.commit.set --push`), or by hand: `rhx git.pull.watch set --which <n> --mode apply`
- one daemon per machine per version key serves every clone on the box; a second `set` finds it, never spawns a twin
- the session-start hook brings a dead daemon back when this clone holds a watch it can serve: one under this key, or one under an older key whose repo root now runs this key. a record no daemon of this key would serve spawns naught

## .each alert → its act

| alert | next line names | your act |
|---|---|---|
| `ci failed on #<n>` | `rhx show.gh.test.errors` | read the errors, fix at cause, push |
| `new comment on #<n>` | `rhx git.pull.comment get --which <n> --in <repo>` | read it; reply in its thread via `rhx git.pull.comment set` |
| `approved #<n>`, ci passed | `rhx git.release --mode apply` | release only on an explicit human order (`rule.require.git-release-confidence`) |
| `approved #<n>`, ci failed | `rhx show.gh.test.errors` | fix ci first |
| `approved #<n>`, ci not done | `rhx git.release --watch` | watch ci to its end |
| `#<n> merged; watch ended` | — | naught; the watch ends itself |
| `#<n> closed without merge; watch ended` | — | ask the human why, if unclear |
| `#<n> answers 404 …; watch ended` | `rhx git.pull.watch set --which <n> --mode apply` | the pr is gone, or the token cannot see it. under the grove token, unlock the seaturtle token first, then rewatch |
| `#<n> quiet for <t>; watch ended` | `rhx git.pull.watch set --which <n> --mode apply` | no change past the idle ttl. rewatch if the pr still matters |
| `#<n> unreadable for <t>; watch ended` | `last fault: …`, then the rewatch | every read faulted past the idle ttl. fix the named fault, then rewatch |

## .the token

- the daemon reads github with keyrack `ehmpathy.prep.EHMPATHY_SEATURTLE_GITHUB_TOKEN`
- where that key is absent, locked, or blocked, it reads the grove token `@all.prep.GITHUB_TOKEN`
- never the human gh login
- the daemon reads keyrack once and holds the token until github refuses it (a 401), or until the held grove token gets a 404; then one fresh read, which prefers the seaturtle token, and one retry
- neither granted → the watch is `paused`; the alert names the fix:
  - `rhx keyrack unlock --owner ehmpath --env prep --key EHMPATHY_SEATURTLE_GITHUB_TOKEN`
  - or, for the whole grove: `rhx keyrack set --owner ehmpath --org @all --env prep --key GITHUB_TOKEN`
- cursors hold while paused. the paused daemon re-reads keyrack on the pr's poll gap, which doubles up to its cap, so alerts resume within that cap (30 min) after the fix. a push, or `rhx git.pull.watch set --which <n> --mode apply`, resumes them at the next tick

## .held and outage

- **held** — `clone say` refused the alert (the clone was busy or deaf). the daemon retries each tick, and the clone hears it at its next prompt (the prompt hook prints each held alert, oldest first). a late alert reads `(held N ticks; you were busy)`
- **outage** — github gave no answer for a while. the note reads `github unreachable for N min`; naught to do, cursors hold

## .see and stop

- `rhx git.pull.watch get` — every daemon on the box, its state, and each watch. a held row reads `· N held, T ticks: <cause>`
- `rhx git.pull.watch del --which <n> --mode apply` — stop this clone's watch on a pr (plan by default)

## .the watch and the release watch

the watch alerts on ci of the pr in the background. `rule.require.watch-release-after-push` still asks you to run `rhx git.release --watch` after each push; the watch does not replace it.
