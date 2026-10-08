# F15 — the two permission gates' parity test lands in its own change

- **fork:** add a both-hooks agreement test in this route, vs catch it as a dream.
- **taken:** dream. the matcher copies predate this route (#27/#50), and the test opens
  `permissionrequest.decide-permissions.sh` and its suite — a hook this route does not touch,
  with a different payload/verdict shape. this route changed neither matcher: the allow check in
  `pretooluse.check-permissions.sh` is untouched but for the failfast budget start.
- **dream:** `.dream/v2026_09_27.fix.permission-gates-share-an-untested-allow-matcher.md`
- **rework:** clean — one additive test file.
- **confidence:** 80%.
- **where:** `claude.hooks/pretooluse.check-permissions.sh`, `claude.hooks/permissionrequest.decide-permissions.sh`.
- **verdict:** —
