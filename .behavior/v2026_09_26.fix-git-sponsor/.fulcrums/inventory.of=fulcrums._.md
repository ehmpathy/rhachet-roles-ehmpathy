# inventory of fulcrums

| case | title | rework | status | confidence |
|---|---|---|---|---|
| F1 | what "doesn't detect a real human" means | clean | ruled by wisher — a `!` command | 100% |
| F2 | gh under `@self` | clean | ruled by wisher — never, in any form | 100% |
| F3 | legacy `@me`: silent, undocumented alias of `@self` | clean | ruled by wisher | 100% |
| F4 | extant `source: me` files: map `me` → `self` on read | clean | best-guessed | 85% |
| F5 | "fix this mess" = the six `Write(...)` boot warns | clean | best-guessed | 90% |
| F6 | clone's machine = git config names a roster identity → refuse | clean | ruled by wisher | 100% |
| F7 | a `!` command: refuse with its true cause — no marker tells it from the clone | clean | closed by measurement | 95% |
| F8 | human's machine: no bind needed, git config is the sponsor; a bind wins | clean | ruled by wisher | 100% |
| F9 | operations sources the seaturtle roster where it lives (`keyrack.operations.sh`) | clean | disputed to peer | 80% |
| F10 | the git identity reader hands its result over as named globals | clean | disputed to peer | 85% |
| F11 | the git identity reader extends `git.commit.operations.sh`, under the role dir | dirty | ruled by wisher — A, ship as is; dream carries the move | 100% |
| F12 | git.commit refusals keep the family's `└─ error:` header; migrate whole later | dirty | ruled by wisher — B, migrate the family now | 100% |
| F13 | the unbound `get` render lifts to operations, one caller, so every arm is testable | clean | disputed to peer | 85% |
| F14 | fix the clock flakes in git.release + git.repo.test `[case19]` here, though this branch never touched them | clean | best-guessed | 90% |
| F15 | fix the host-bound skip (`take [t2]`); leave the llm- and upstream-bound `describe.skip` suites | dirty | best-guessed | 75% |
| F16 | eight dark l1 lanes: bound their `**/` `--paths-with` to `src/**` (a guard edit), rather than overrule them | clean | ruled by wisher — A, grant given; binds applied | 80% |
| F17 | git.commit journeys stay at the integration grain; an acceptance harness is its own change | dirty | disputed to peer | 75% |
| F18 | real gh / keyrack / git remote called with no credential; the authenticated path waits on a ci secret | clean | disputed to peer | 85% |
| F19 | refusal arms with no test on main stay untested here; the family arm sweep is its own change | clean | disputed to peer | 80% |
| F20 | git.commit.push keeps its two bespoke coconut headers (on main before this branch); the header sweep is its own change | clean | disputed to peer | 85% |