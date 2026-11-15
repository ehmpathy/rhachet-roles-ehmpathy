# inventory of fulcrums

| case | title | rework | status | confidence |
|---|---|---|---|---|
| F1 | gate the feature pr only, not the release-please pr | clean | best-guessed, awaits the commander | 80% |
| F2 | latest decisive review per human login decides; COMMENTED is not decisive | clean | best-guessed, awaits the commander | 88% |
| F3 | robot = `[bot]` in login, or `type: Bot`, or a seaturtle roster login | clean | best-guessed, awaits the commander | 90% |
| F4 | no exemption for a human at a terminal | clean | best-guessed, awaits the commander | 75% |
| F5 | on refusal, disable an automerge an earlier run left on | clean | best-guessed, awaits the commander | 85% |
| F6 | an approver must be OWNER, MEMBER, or COLLABORATOR on the repo | clean | best-guessed, awaits the commander | 90% |
| F7 | dispute peer blockers on `.husky/check.{secrets,timestamps.lock}.sh` as out of scope (local drift, not in the pr) | clean | best-guessed, awaits the commander | 92% |
| F8 | the refusal echoes the extant apply header (`--mode apply --watch`), not the typed flags | clean | best-guessed, awaits the commander | 90% |
| F9 | an approval counts only on the pr head; a push after approval needs a fresh one | clean | best-guessed, awaits the commander | 75% |
| F10 | plan and watch read no reviews; no early "approval owed" line | clean | best-guessed, awaits the commander | 80% |
| F11 | the apply holds an automerge lease bound to the process; each poll re-checks head and verdict (disarm on drift, revoke, or any unmerged exit); the one-poll window, SIGKILL, and outside pushes are closed server-side | clean | best-guessed, awaits the commander | 80% |
| F12 | the verdict and the cause stay two jq passes over one shared rule set | clean | best-guessed, awaits the commander | 85% |
| F13 | the merge pin ships before a live run proves it; every outcome fails closed | clean | best-guessed, awaits the commander | 85% |
| F14 | the gate's output stays minimal: no ci line, no pass line, no second header | clean | best-guessed, awaits the commander | 80% |
| F15 | the lease reads the head with its own call each poll (one head reader for gate, pin, lease) | clean | best-guessed, awaits the commander | 80% |
| F16 | the gate and the lease disarm any automerge on the pr, not only the clone's | clean | best-guessed, awaits the commander | 85% |
| F17 | the lease stays in the watch file under its current names; the move rides with F12 | clean | best-guessed, awaits the commander | 80% |
| F18 | the gate's call site and operations keep the skill's extant idioms (inline mode check, per-function parser, per-renderer prologue) | clean | best-guessed, awaits the commander | 80% |