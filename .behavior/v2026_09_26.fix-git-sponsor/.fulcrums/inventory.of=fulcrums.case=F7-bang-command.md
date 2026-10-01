# F7 — a human's `!` command in a claude session

- fork: (a) keep refused, but name the true cause and the fix · (b) admit `!` via a marker only a
  human's `!` carries · (c) admit any claude session
- taken: (a)
- evidence (measured 2026-09-26): the wisher's `! env | grep -i claude` and the clone's tool shell
  carry identical claude markers — `CLAUDECODE`, `CLAUDE_CODE_ENTRYPOINT`, `AI_AGENT`,
  `CLAUDE_CODE_SESSION_ATTENDED`, `CLAUDE_CODE_CHILD_SESSION`, and the same session id, pid, and
  socket. (b) has no marker to use. (c) would admit the clone itself.
- rework: clean
- confidence: 95%
- where: `case=8`, yield Q8
- verdict: closed by measurement
