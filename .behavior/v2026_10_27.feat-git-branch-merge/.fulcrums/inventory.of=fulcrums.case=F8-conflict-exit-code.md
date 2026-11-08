# F8 — conflict stop exits 2

- **fork**: (a) exit 1 as `git.branch.rebase` does · (b) exit 2 with `✋ ConstraintError`
- **taken**: (b). the caller must act; `rule.require.exit-code-semantics` and `rule.require.qualified-error-headers`
- **rework**: clean
- **risk**: low. a new verb has no callers to break; exit 2 = caller must act is the repo's declared semantics
- **confidence**: 95%
- **where**: `1.vision.yield.md` Q8
- **verdict**: open
