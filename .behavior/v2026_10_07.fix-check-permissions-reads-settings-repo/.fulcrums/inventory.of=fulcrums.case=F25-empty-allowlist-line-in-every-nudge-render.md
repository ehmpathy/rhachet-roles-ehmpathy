# F25 — the empty-allowlist malfunction rides every nudge render, beside main's own lines

- **fork**: on the rebase onto #917, main's nudge render gained modes (LOOKUP, SOFTNUDGE,
  HARDNUDGE) and its own malfunction lines. (a) the #895 empty-allowlist line (`no pre-approved
  bash permissions were found; looked in: …`) prints in each mode whenever no layer holds a Bash
  allow · (b) it prints only in the HARDNUDGE block, as before the rebase
- **taken**: (a). an empty allowlist is the one fault that explains every block at once; a LOOKUP
  (`rhx permissions.get --for`) or a SOFTNUDGE that hides it leaves the clone to guess why the
  command it asked about would block
- **the cost, stated**: main's cases that wrote `allow: []` as filler now render the line. their
  fixtures took one sentinel allow (`Bash(surfwax:*)`) that no tested command matches, so each
  case still tests what it named (inventory, record, lock) — see F27
- **rework**: clean — one guard on the mode in `print_malfunction_lines`; a resnap
- **confidence**: 80% — the wisher may want LOOKUP to stay terse
- **where**: `pretooluse.check-permissions.sh` `print_malfunction_lines`;
  `pretooluse.check-permissions.integration.test.ts` [case40][t15]
- **verdict**: —
