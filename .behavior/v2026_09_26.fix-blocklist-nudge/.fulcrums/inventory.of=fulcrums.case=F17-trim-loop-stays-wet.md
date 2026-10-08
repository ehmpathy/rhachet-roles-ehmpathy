# F17 — the two whitespace-trim loops stay inline

- **fork:** extract a `trim_whitespace` helper for the two trim loops, vs keep them inline.
- **taken:** inline. two copies, under the rule of three (`rule.prefer.wet-over-dry`); one copy
  (`command_is_allowed`) predates this route, and a helper call per part would land on the allow
  path — the one path this route keeps unchanged and fast.
- **rework:** clean — a two-line extraction.
- **confidence:** 85%.
- **where:** `command_is_allowed`, `get_blocked_parts`.
- **verdict:** —
