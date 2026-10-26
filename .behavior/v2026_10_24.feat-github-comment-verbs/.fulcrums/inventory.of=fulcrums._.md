# inventory.of=fulcrums

| case | title | rework | status | confidence |
|---|---|---|---|---|
| F1 | upsert key = hidden html marker, author-scoped | clean (until comments ship) | stands as best-guessed (wisher, 2026-10-24) | 75% |
| F2 | pr body as `set --kind body`, not a separate `git.pr.body.set` | clean | **superseded by #1035** (commander, 2026-10-25): set writes comments only, each with 🐢; `set --kind body` and `del --kind body` refuse (exit 2); `get --kind body` still reads it. the description verbs ride #1165 | — |
| F3 | `--in <owner/name>`, not the draft's `--repo-target` | clean | best-guessed | 85% |
| F4 | the home-org allowlist | clean | **ruled: keep it** — any other owner → exit 2, list named (wisher, 2026-10-24) | — |
| F5 | drop the draft's required `--why` | clean | stands as best-guessed (wisher, 2026-10-24) | 70% |
| F6 | the real-api case: target + credential | clean | **ruled: one case, home-org pr, keyrack `ehmpath`/`test`, fail loud; ci grant filed later by the wisher** (2026-10-24). target `rhachet-roles-ehmpathy#1039`: the wish's "test repo" yields here, since no home-org test repo holds a pr and the wish bounds the drive to one pr (see the F6 entry) | — |
| F7 | 🐢 prefix on comments, none on the pr body | clean | stands as best-guessed (wisher, 2026-10-24) | 75% |
| F8 | `--pr` required on every call, `--id` included | clean | best-guessed | 85% |
| F9 | reuse via `../git.commit/*` (repo precedent), not a shared-module lift in this pr | clean | best-guessed; dream caught | 80% |
| F10 | the vision holds contract + suite + groundwork, as approved | clean | best-guessed | 85% |
| F11 | `git.pull.comment.operations.sh` beside its verbs, not in `src/domain.operations/` (only `skills/**/*.sh` ships) | dirty | best-guessed | 85% |
| F12 | 5.3 leaves main's `describe.skip` suites skipped; repairs only the two red suites the full run found | clean | best-guessed | 85% |
| F13 | `await.file.pattern` stays out of this pr (draft in the gitignored `.agent/.cache/`); its lift + test ride a separate pr | clean | best-guessed; dream caught | 85% |
| F14 | the real-api case runs `--auth as-human` under the ci job token (isolated gh login; test, publish, and the integration job grant pull-requests + issues write); no keyrack ask (bulletin auth-as-human-stopgap); a live `as-ehmpath` case waits on the token | clean | ruled by the director 2026-10-24 (red); green since 2026-10-24; open on the commander queue: accept as-human coverage, or hold for `as-ehmpath` | 90% |
| F15 | get shows the raw body (marker, full length); json keeps `kind: "body"` and `body`; acceptance proves dispatch only | clean | best-guessed | 85% |
| F16 | render polish held past the l3 budget: row term, sort, no-op json, full hash, shared auth label, placeholders | clean | best-guessed | 80% |
| F17 | "a comment the robot authored" = author is the credential's login AND the body opens with 🐢; all else is a human's, and del refuses it (exit 2) | clean | open for the commander (via director rhachet-ktlo) | 75% |
| F18 | the pr description refusal (set/del `--kind body`) names the github ui and #1165 as its fix, until #1165 ships a description verb | clean | open for the commander (via director rhachet-ktlo) | 80% |