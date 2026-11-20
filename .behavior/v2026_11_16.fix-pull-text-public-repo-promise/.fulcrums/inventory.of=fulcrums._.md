# inventory: fulcrums

| case | title | rework | status | confidence |
|---|---|---|---|---|
| F1 | git.commit.push gates the whole push, not just the pr create | clean | ruled: holds | 100% |
| F2 | the nudge keeps the issue's 🐢 header, not a `✋ ConstraintError:` header | clean | best-guessed | 85% |
| F3 | plan mode exits 2 on the nudge, as apply does | clean | best-guessed | 80% |
| F4 | a no-op passes ungated: no text goes out | clean | best-guessed | 85% |
| F5 | the promise skips the visibility read; the read runs under the skill's own credential | clean | best-guessed | 80% |
| F6 | git.commit.set --push owns its own gate, before the commit, and threads --promise | clean | best-guessed | 85% |
| F7 | --promise takes one value; any other value is refused | clean | best-guessed | 90% |
| F8 | review scope is the pr diff; unstaged husky edits and uncommitted route docs do not ship | clean | best-guessed | 90% |
| F9 | a held @stdin text is kept in ./.temp, named by its digest; not the git dir, not /tmp | clean | best-guessed | 75% |
| F10 | skips in files outside this pr stay, each named; a followup owns them | clean | best-guessed | 75% |
