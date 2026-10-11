# F11 — the block render stays on stderr only

- **fork:** tee the block render and malfunction lines to stdout and stderr, per
  `rule.require.skill-output-streams`, vs keep them on stderr only.
- **taken:** stderr only. claude code's PreToolUse contract: on exit 2 it feeds **stderr** to the
  model as the block reason; stdout on a block is not the channel. on exit 0, stdout carries the
  `permissionDecision` JSON, which must stay pure JSON. the peer hooks
  (`pretooluse.forbid-*.sh`) follow the same contract. the streams rule scopes "skill output";
  a hook's streams are fixed by the harness.
- **rework:** clean — one `| tee /dev/stderr` if the harness contract changes.
- **confidence:** 85%.
- **where:** `pretooluse.check-permissions.sh`, the block and malfunction writes.
- **verdict:** overruled by the wisher (2026-09-27) — block and malfunction output goes to stdout
  and stderr. the exit-0 ask payload stays pure json on stdout.
