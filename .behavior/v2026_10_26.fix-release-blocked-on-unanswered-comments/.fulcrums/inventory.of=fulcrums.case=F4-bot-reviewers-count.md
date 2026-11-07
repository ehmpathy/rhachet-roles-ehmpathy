# F4 — bot-authored rows are never unanswered

## the fork
- A: count every non-robot row, bot or human
- B: skip rows whose author login ends in `[bot]`

## taken: B, and why at the time
- task: "a human comment with no reply after it"
- live read of #1143 holds a `rhelease[bot]` issue comment ("released at …"). under A it is newer than the robot's latest issue comment, so it reads as unanswered and would block every later release of any pr that bot touched

## rework: clean
one filter on author login, in `as_rows_unanswered`.

## confidence: 85%, why low
a bot code reviewer (e.g. copilot) that raises a real defect would pass under B.

## where
1.vision.yield.md § the contract (amendments)

## verdict
(awaits council)
