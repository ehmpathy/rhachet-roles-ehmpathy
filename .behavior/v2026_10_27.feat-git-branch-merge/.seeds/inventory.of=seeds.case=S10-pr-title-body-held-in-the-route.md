# S10 — the pr title and body match the whole diff, held in the route until a verb sets them

## .said
> director, 16:4xZ. outcome owed: a pr title and body for #1205 that match its whole diff (what it does, what rides along and why, how to review it fast), held in your route as pr.title-body.md, ready to set the moment a git.pull.title verb ships; no human sets it. commit it at the done gate, push, git.release --watch green. never merge, never --apply. reply with the head sha and the title you wrote.

## .settled
- the title and body match the whole diff of #1205, not the catchup verb alone
- the body says what it does, what rides along and why, and how to review it fast
- they live in the route at `pr.title-body.md`, ready for a `git.pull.title` verb; no human sets them
- commit at the done gate, push, `git.release --watch` green; no merge, no `--apply`

## .landed
| artifact | change |
|---|---|
| `pr.title-body.md` | title, body: what it does, ride-alongs with reasons, verification, review order, open fulcrums |
| `5.1.execution.from_vision.yield.md` | `.pr` section points at `pr.title-body.md`; the retitle item names where it is held |
