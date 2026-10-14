# F11 — "user layer" names claude's user settings scope, not a person

- **fork**: (a) keep "plus the project and user layers" in the config-dir line · (b) reword to "human layer" or "home layer"
- **taken**: (a). claude code names its three settings scopes user, project, and local; "user" here is that domain term, the same word the vision's layer rule uses (`user dir = $CLAUDE_CONFIG_DIR, else $HOME/.claude`). `rule.require.term-human` exempts it in its own `.note`: "applies to person references, not domain concepts like `user` objects". "human layer" names no scope claude has; "home layer" is wrong whenever `$CLAUDE_CONFIG_DIR` is set, since the user dir is then the config dir, not `$HOME/.claude`. the other flagged line, the extant "user approval" text, falls under F10
- **refined (peer r010, i005)**: the config-dir line shows only when `$CLAUDE_CONFIG_DIR` is set, and
  then the user layer IS the config dir's `settings.json`. so "plus the user layer" double-counted
  and read as `$HOME/.claude`. the line now reads `(allowlist of config dir X, plus the project
  layer)`, or `(allowlist of config dir X)` with no walk-up dir; "user" no longer appears in it
- **rework**: clean — one string, one snapshot
- **confidence**: 85%
- **where**: peer review r009 (ergo-friction-hazards) blocker.1
- **verdict**: —
