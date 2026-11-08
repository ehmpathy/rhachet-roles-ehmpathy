# inventory of fulcrums

the commander delegated Q1–Q8 (2026-11-01): take each lean, itemize each as a fulcrum, overturnable
at the pr review. each row is a clean rework unless marked.

| case | title | rework | status | confidence |
|---|---|---|---|---|
| F1 | target: current branch by default, `--pr` override | clean | taken (Q1 lean A) | 90% |
| F2 | title input: inline `--title` | clean | overturned (commander, #1173 review: `--from <path\|@stdin>`, symmetric with the body) | 90% |
| F3 | no quota gate on set | clean | ruled: kept (commander, #1173 review) | 85% |
| F4 | no secret-shaped body refusal | clean | overturned (commander, #1173 review: in; both set verbs refuse) | 80% |
| F5 | the attribution lives in `git/git.attribution.operations.sh` | clean | taken (Q5 lean B, after i002 r5) | 90% |
| F6 | one `git.pull.operations.sh`, which sources #1143's ops rather than a copy | clean | taken (Q6 lean A, copy clause dropped) | 85% |
| F7 | the fake gh is the gate; a live-api suite is opt-in, by a named target flag | clean | ruled B (commander 2026-10-31, director at 5.3) | 90% |
| F8 | no client title cap; github's 422 mapped to a ConstraintError | clean | taken (Q8 lean B) | 85% |
| F9 | `get` adds `--output text`: the bare field, for a pipe | clean | taken (call under 93%) | 75% |
| F10 | a body with no words once stripped is refused, as an empty one is | clean | taken (call under 93%) | 85% |
| F11 | defer a paved execute-bit skill to a dream, not this pull | clean | taken (deferral for dirt) | 85% |
| F12 | the two set verbs keep their own skeletons; no shared `set_one_pull_field` | clean | taken (call under 93%) | 80% |
| F13 | title and description boot as `ref`, not `say` | clean | taken (boot budget) | 85% |
| F14 | defer the auth-vocabulary lift and the terminal-stdin guard to dreams | clean | taken (deferral for dirt) | 85% |
| F15 | the shell ops stay in the skills tree, not `src/domain.operations/` | dirty | taken (disputes i002 r1) | 85% |
| F16 | a refusal under `get --output text` goes to both streams | clean | taken (repo rule over i002 r9's option A) | 80% |
| F17 | a set writes only a pull its own credential opened; no override flag | clean | taken (i007 r11 item 1) | 85% |
| F18 | defer the pull-layer inversion and the protocol folds to a dream | clean | taken (deferral for dirt, i007 r11 items 2–3; re-raised i008 r11 item 2) | 75% |
| F19 | the comment-verb edits this pull makes stale ride along with it | clean | taken (i008 r11 item 5) | 85% |
| F20 | refusals and plan hints print the dotted verb; help and the steer teach the spaced one | clean | taken (deferral for dirt, 5.3 has-ergonomics-validated) | 70% |
| F21 | the comment real-api snapshot keeps its json as strings until a live re-run | clean | taken (5.3 r6 blocker.1, disputed) | 80% |
| F22 | the as-human auth label keeps the word "fallback" | dirty | taken (deferral for dirt, 5.3 r11 n1) | 75% |
| F23 | the shared refusals this pull touches revise #1143's locked comment expectations | clean | taken (5.3 r12 i004 blocker.1, disputed for sign-off) | 80% |
| F24 | the title and description renders changed under peer review, after the first push | clean | taken (5.3 r12 i004 blocker.2, i005 blockers 7–11, disputed for sign-off) | 85% |
| F25 | the gh-logged-out refusal echoes its fix in the detail row | dirty | taken (deferral for dirt, 5.3 r11 i004 n4) | 75% |
