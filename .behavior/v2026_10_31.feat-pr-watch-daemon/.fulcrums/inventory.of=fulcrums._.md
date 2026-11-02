# inventory of fulcrums

risk bar: **risky** = it touches a credential or writes to prod; else **low**.

| case | title | rework | risk | status | confidence |
|---|---|---|---|---|---|
| F1 | skill name `git.pull.watch` | clean | low — a name; no credential, no prod write | best-guessed, rides vision approval | 80% |
| F2 | delivery via `rhx clone say`, not bhuild phone | clean | low — a local message into a local clone; no credential, no prod write | ruled by director: (a) `clone say` now, phone later (Q1) | 85% |
| F3 | auto subscribe inside `git.commit.push` at pr findsert | clean | low — the subscribe writes a local watch record; it reads no credential and adds no prod write to the push | best-guessed, rides vision approval | 85% |
| F4 | state under `~/.rhachet/storage/.../skill=git.pull.watch/v=$version/` | clean | low — a local state dir; no credential, no prod write | best-guessed, rides vision approval | 88% |
| F5 | lifetime = exit at zero watches, not tied to a spawner | dirty | low — a process lifetime; no credential, no prod write | best-guessed, rides vision approval | 90% |
| F6 | daemon runs from a per-version copy of its code, not the spawner's worktree | clean | low — a local file copy; no credential, no prod write | answered by logic (Q7); director ruled the lean | 75% |
| F7 | daemon key = version + hash of daemon code | clean | low — a local key; no credential, no prod write | ruled by director: (b) version + code hash (Q8) | 70% |
| F8 | own-comment filter by per-clone ledger of posted ids, not by login | clean | low — a local ledger of comment ids; the token use in `git.pull.comment set` is extant and unchanged | ruled by director: (b) per-clone ledger (Q9) | 80% |
| F9 | dispute r2 nitpick "case=5 has no bdd sketch" as a diff misread | clean | low — a review disposition; no credential, no prod write | disputed; council | 97% |
| F10 | dispute r3 blocker "case=9 bdd truncated" — the prompt held it whole | clean | low — a review disposition; no credential, no prod write | disputed; council | 97% |
| F11 | github token the daemon reads with | clean | **risky — it touches a credential**: one box-wide token reads every watched pr | ruled by director: (a) ehmpath keyrack token; the human login is never used (Q2) | 95% |
| F12 | how 5.1 meets the plan: blueprint gate, new stone, or direct | clean | low — a document and read-only probes; no credential, no prod write | ruled by commander: (3) execute direct from the vision; the blueprint is the 5.1 plan (S2) | 100% |
| F13 | lock + detach: linux-only `flock`/`setsid`, or portable `mkdir` lock + `nohup` (QB1) | clean | low — a local lock dir and a process spawn; no credential, no prod write | best-guessed at the lean: (b) portable | 85% |
| F14 | daemon language: bash or node (QB2) | dirty | low — a language choice; no credential, no prod write | best-guessed at the lean: (a) bash | 85% |
| F15 | live delivery test tier (QB3) | clean | low — a test tier; none bills a brain, no oauth token | best-guessed at the lean: (a) none now; dream for later | 85% |
| F16 | read a `clone say` result by json verdict, not exit code (QB4) | clean | low — a local read of a local verdict; no credential, no prod write | best-guessed at the lean: (b) json verdict | 95% |
| F17 | daemon reads the spawner's login-session keyrack (QB5) | clean | **risky — it touches a credential**: the daemon reads the session's unlocked token | best-guessed at the lean: (a) accept | 85% |
| F18 | a held alert whose verdict stays a malfunction (QB6) | clean | low — a local retry; no credential, no prod write | best-guessed at the lean: (a) retry each tick, a log line each 10th | 85% |
| F19 | `set` on an unreadable clone registry: refuse, or proceed | clean | low — a local read of a local registry; no credential, no prod write | best-guessed: refuse as a malfunction; the daemon still keeps a watch on an unreadable read | 85% |
| F20 | where tests shed the session's clone serial: per runner, or once in the jest env | clean | low — a test env var; no credential, no prod write | best-guessed: once, in `jest.integration.env.ts` | 88% |
| F21 | boot over budget by ~100 tokens: raise the cap, or condense | clean | low — boot prose; no credential, no prod write | best-guessed: condense the two say headers this change touched; cap held at 30,000 | 90% |
| F22 | no paved `chmod`: ask a human, or pave a repo skill | clean | low — a repo-local skill that sets +x on `.sh` files inside the repo; no credential, no prod write | best-guessed: pave `chmodsafe`; its jest suite lives in `src/.test/skills.repo.this/` (dream: a co-located home) | 85% |
| F23 | an approval's `next` when ci has not finished: watch, apply, or none | clean | low — an alert line; no credential, no prod write | best-guessed: `rhx git.release --watch` | 85% |
| F24 | the event diff jq: a unit test of its own, or its branches at the integration grain | clean | low — a test grain; no credential, no prod write | best-guessed: integration grain; disputed r008 nitpick.1 | 85% |
| F25 | a malfunction beside a completed act: exit 0 or exit 1 | clean | low — an exit code; no credential, no prod write | best-guessed: class kept, exit 0; disputed r002 nitpick.1, nitpick.2 | 80% |
| F26 | an alert's next move: a coconut aside, or a line of the render | clean | low — alert prose; no credential, no prod write | best-guessed: a line of the render, since the move is the point of the alert; disputed r001 nitpick.1 | 82% |
| F27 | structure refactors of the watch skill: now, or a followup | clean | low — internal file layout; no credential, no prod write | best-guessed: defer each to a dream; the defects they invite are fixed at cause with clamps | 80% |
| F28 | a clone's own comments: local ledger, or a `clone=` attr in the public marker | clean | low — a local ledger; the marker option would post the clone serial in public pr text | best-guessed: keep the ledger; disputed r011 nitpick.6 | 85% |
| F29 | commit per stone, or at the done gate | clean | low — when a commit lands; no credential, no prod write | ruled by commander: at the done gate; disputed r010 nitpick.9 | 99% |
| F30 | eight questions that change what the watch says (excerpt trust, unreadable pr, ci `next:` workflow + branch + repo, legacy statuses, bot mute, cancelled runs, approval body, push's release watch) | clean | low — alert and `set` text; no credential, no prod write | held for the commander; not best-guessed | n/a |
| F31 | the push's watch set: an outer cap, or the set's own bounds | clean | low — push latency, bounded at ~30s; no credential, no prod write | best-guessed: the set's own bounds; disputed r007 nitpick.4 | 85% |
| F32 | the DEAD verdict of `clone say`: a strict json parse, or a pattern over both streams | clean | low — a dead watch drop; a strict parse would keep dead watches | best-guessed: the pattern; disputed r011 nitpick.8 | 82% |
| F33 | a key move: write the new record first (fault = twin alert), or delete the old first (fault = lost watch) | clean | low — a twin alert until a rerun; surfaced with its fix | best-guessed: write new first; disputed r007 nitpick.2 | 90% |