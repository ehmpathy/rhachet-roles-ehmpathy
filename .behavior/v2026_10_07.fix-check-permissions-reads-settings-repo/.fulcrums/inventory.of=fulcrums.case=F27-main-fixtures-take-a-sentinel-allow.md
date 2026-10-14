# F27 — main's check-permissions fixtures take a sentinel allow, not an empty one

- **fork**: 32 fixtures in `pretooluse.check-permissions.integration.test.ts` (from #917) write
  `allow: []` as filler. after F25 each of them renders the empty-allowlist line. (a) give each
  one sentinel allow, `Bash(surfwax:*)`, that no tested command matches · (b) keep `allow: []`
  and resnap every render with the extra line · (c) assert `not.toContain` only the fault each
  case tests
- **taken**: (a). the cases test the inventory, the nudge record, and its lock; an empty
  allowlist is not their subject. (a) keeps each snapshot about its own subject, and the
  empty-allowlist render keeps its own cases in the layers suite
- **the cost, stated**: the sentinel is one more token per fixture, and a reader may wonder what
  `surfwax` is. no tested command starts with it
- **rework**: clean — one sedreplace back to `allow: []` and a resnap
- **confidence**: 85%
- **where**: `pretooluse.check-permissions.integration.test.ts`, 32 fixture sites
- **verdict**: —
