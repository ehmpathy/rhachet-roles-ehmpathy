# F18 — whether the ask reason reaches the human's prompt is a live check for the wisher

- **fork:** prove in a test that claude code shows `permissionDecisionReason` in the permission
  dialog, vs leave it to a live check.
- **taken:** live check. no test in this repo can drive claude code's dialog. the hook's half is
  tested (the `ask` json and its reason: case8 `[t1]`, case34 `[t1]`, case40 ask snapshot). if the
  dialog omits the reason, the ruled fallback holds: today's bare prompt, context in the ledger
  (R3) — no regression from `main`.
- **the check:** retry a nudged command once within 60s; read the permission dialog for the
  "🐢 retried after a nudge" lines.
- **rework:** clean — none owed either way.
- **confidence:** 80%.
- **where:** `print_ask_payload`, case=4 of the vision.
- **verdict:** checked live by the wisher (2026-09-27) — the dialog shows a bare prompt; the
  reason does not surface. the ruled fallback holds: the "why" lives in the ledger's `retried`
  rows. no regression from `main`.
