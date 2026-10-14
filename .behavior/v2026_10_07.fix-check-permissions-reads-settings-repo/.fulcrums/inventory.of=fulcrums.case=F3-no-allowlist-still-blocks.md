# F3 — no allowlist found still blocks once

- **fork**: (a) block once (HARDNUDGE) with a diagnostic that names each path read · (b) pass with exit 0, since an absent list is a config fault the hook cannot judge
- **taken**: (a). the wish asks the hook to "say so"; a pass would hide the fault entirely. the retry window still lets the clone through on a second try
- **rework**: clean — one branch
- **confidence**: 80%
- **where**: `case=7`
- **verdict**: —
