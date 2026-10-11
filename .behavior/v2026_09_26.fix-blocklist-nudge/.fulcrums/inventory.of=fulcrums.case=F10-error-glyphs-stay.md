# F10 — the error glyphs stay ✋ / 💥

- **fork:** swap the error headers to a nature glyph (`⛈️`) per `rule.prefer.chill-nature-emojis`,
  vs keep `✋ ConstraintError:` / `💥 MalfunctionError:`.
- **taken:** keep. `rule.require.qualified-error-headers` (mechanic) mandates exactly these two
  glyphs for exactly these two classes, at blocker severity; the nature-emoji rule is a `prefer`
  (nitpick) for comments and logs. the require outranks the prefer.
- **rework:** clean — two strings, if the rules ever converge.
- **confidence:** 95%.
- **where:** every header in `pretooluse.check-permissions.sh`.
- **verdict:** —
