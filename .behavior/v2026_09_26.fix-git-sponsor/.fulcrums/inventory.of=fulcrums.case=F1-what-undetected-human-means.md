# F1 — what "doesn't detect a real human" means

- fork: (a) the actor guard refuses a human · (b) the skill never uses the local identity, so `@me` names the human differently from their own commits
- taken, at first: (b), 70% — reasoned that `rhx` passes a real terminal through
- verdict (wisher, 2026-09-26): **(a).** the wisher ran the bind as a claude `!` command, which has
  no tty on any stream; the actor guard refused them as though a clone. (b) is also real, and the
  `@self` rework fixes it; (a) is fixed by case=8's refusal, with Q8 open.
- rework: clean
- where: `case=8`, yield A1
