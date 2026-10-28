# F3 — which scoped runs bypass

- **fork:** only scoped `unit` runs bypass (the wish's literal example) · every path-scoped run
  without `--thorough` bypasses · bypass only below a matched-file threshold
- **taken:** every path-scoped run without `--thorough`. a `name://` scope alone does not narrow
  the file list (jest loads every file, then filters by name), so it is bounded — clamped,
  `[case4]`. the wish closes "the bound is for the full and thorough runs"; a scoped integration
  loop is the dev loop for this very repo, and a multi-minute queue there is the friction the
  bypass exists to avoid
- **why no file-count threshold:** a path scope is the human's declared intent to run less; a
  threshold adds a magic number the human cannot see, and a broad scope such as `--scope src`
  is rare and explicit. `--thorough` stays the switch that makes any scope full
- **rework:** clean — one condition (a threshold on `SCOPE_FILE_COUNT`, known before the claim)
- **confidence:** 70%. the wish's example names `unit`; its rule names full and thorough; "small"
  is not measured
- **where:** yield `.the contract` (bounded runs, bypass); `get_grove_bypass_reason`
- **raised by:** peer i004 — enroll-impl-behavior-intent blocker.1 (name:// half conceded, the
  broad-path half disputed here)
- **verdict:** awaited
