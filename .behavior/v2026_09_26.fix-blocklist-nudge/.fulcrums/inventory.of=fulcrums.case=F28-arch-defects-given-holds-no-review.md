# F28 — the i011 arch-defects given holds no review; its 2 blockers are a tally of prose

- **fork:** treat the two tallied blockers as code concerns and fix them, or dispute them as a
  reviewer malfunction.
- **taken:** dispute. the given (`…i011….r011._.given.by_peer.enroll-impl-arch-defects.md`) holds
  no concern about the code:
  - the enrolled clone tried to drive the route itself (`route.stone.set --as arrived`) and was
    refused: `ConstraintError: clone enroll depth budget spent`
  - it then printed a question to its caller ("Which do you want?") about lanes r10 and r11
  - it wrote that it had done an arch-defects review "above", but no such review reached stdout
  - the tallier (`openrouter/deepseek/flash`) read "the two that actually block the gate" — r10 and
    r11 — as two blockers. they name review lanes, not defects
- **the repair, in the guard:** both l3 prompts now fence the role — "you are a peer reviewer, not
  the driver: never run route.* commands, never enroll a clone, never ask a question" — and demand
  each concern labeled `[blocker|nitpick][urgent|better]` plus the two count lines. the
  arch-defects prompt reads the diff since `origin/main` (F27: local main is stale). the
  behavior-intent prompt, which timed out twice, reads the vision and the three changed surfaces
  only.
- **rework:** clean — if the council wants the lane re-read, add one round of budget to
  `enroll-impl-arch-defects` and let the guard run the fenced prompt.
- **confidence:** 95% — the given is quoted verbatim above; no file, line, or behavior is named in it.
- **where:** `5.1.execution.from_vision.guard` (the two l3 lanes).
- **verdict:** —
