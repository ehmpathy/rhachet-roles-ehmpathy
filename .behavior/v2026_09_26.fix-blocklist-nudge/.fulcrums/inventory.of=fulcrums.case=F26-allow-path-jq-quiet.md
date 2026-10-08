# F26 — the hook's allow-path settings read stays quiet; the block path names any file it cannot read

- **fork:** drop `2>/dev/null` from the hook's `get_bash_patterns` (as the notice and the skill
  capture jq's stderr), or keep it quiet on the allow path.
- **taken:** keep it quiet, and make the block-path probe run the same program:
  - a settings file the allow path cannot read yields no patterns from it, so every command it
    would have allowed blocks — the gate fails closed, never open
  - `get_settings_malfunction` runs the allow path's own jq program (`BASH_PATTERNS_FILTER`, one
    constant for both) and leads the block render with `💥 MalfunctionError: settings file
    unparseable: <file> (jq: …)`. so any file the allow path cannot read — bad syntax OR a bad
    shape — is named on the block it causes
  - the allow path runs on every Bash call and exits 0 in silence by contract; jq's stderr there
    would print on calls that pass
- **correction (i010 arch-defects, conceded urgent):** the probe once ran a syntax-only
  `jq empty`. a valid-json file of the wrong shape (`"allow": "Bash(ls)"`) passed it, while the
  allow path's program failed on it in silence: every command blocked with "no paved path fits"
  and no cause named. the shared constant closes that; case42 `[t1]` clamps it, proven to bite.
- **raised by:** `mech-failhides` i010 nitpick.1; `enroll-impl-arch-defects` i010 blocker.1.
- **rework:** clean — capture stderr into a variable and drop it, if the council prefers one shape.
- **confidence:** 90% — the fail-closed path, the shared program, and both clamps are checkable.
- **where:** `pretooluse.check-permissions.sh` (`BASH_PATTERNS_FILTER`, `get_bash_patterns`,
  `get_settings_malfunction`).
- **verdict:** —
