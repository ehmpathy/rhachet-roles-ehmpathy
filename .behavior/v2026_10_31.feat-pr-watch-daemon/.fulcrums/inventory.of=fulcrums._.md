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
