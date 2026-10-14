# F19 — the matcher's pattern syntax stays as it was

- **fork**: (a) keep the extant matcher (exact and `:*` prefix) · (b) teach it claude's other forms
  (bare `Bash`, `Bash(*)`, `Bash(npm run *)`)
- **taken**: (a). #895 is about which files the hooks read, not how a pattern matches; the matcher
  is unchanged by this route. (b) changes the gate's semantics for every repo and wants its own
  research on claude's current pattern syntax. caught as a dream for its own route
- **the risk, stated**: the user layer now joins the read set, and a human's home file is the
  likeliest place for a bare `Bash` or a space-star form. such a pattern is skipped, so its command
  blocks once (the nudge), then passes to claude on retry
- **rework**: dirty — the matcher is shared by check and decide, with a cost ratchet on each
- **confidence**: 85%
- **where**: peer r010 i005, item 6 (the matcher)
- **verdict**: —
