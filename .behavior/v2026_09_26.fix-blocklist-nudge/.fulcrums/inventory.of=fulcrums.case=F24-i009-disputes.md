# F24 — two i009 nitpicks disputed with evidence

- **fork:** change code to satisfy each, or dispute it with evidence.
- **taken:** dispute both.
  1. `mech-failhides` nitpick.1 — the report is a reviewer malfunction, not a defect report. its
     body reads `placeholder`, then loops on a regex it says it cannot read ("I can't read the
     exact regex … this is probably not a violation anyway"), and ends: *"Final output: no
     violations"*, `{"done": true, "blockers": [], "nitpicks": []}`. the tally still counted one
     nitpick. the regex it circled is the `asJsonFromJsonc` comma strip, already shown correct in
     F23 (item 1).
  2. `repo-rules` nitpick.1, the `cmd` half — case51 `[t3]` keeps `cmd` on purpose. it is the
     exact live pair (`chmod` was offered `did you mean? cmd …`), and `cmd` sits two deletions from
     `chmod`, which is the defect the clamp pins. a themed word would not sit two deletions from
     `chmod`, so the clamp would stop to bite. the generic half of the same nitpick (`file.txt`) is
     repaired (`waves.txt`), and the test now carries a `.note` that says why `cmd` stays.
- **rework:** clean — each is a one-line edit if the council rules otherwise.
- **confidence:** 90% — both are checkable: one against the report text, one against the clamp.
- **where:** `.reviews/peer/…i009…r002…mech-failhides.report.md`;
  `pretooluse.check-permissions.integration.test.ts` case51 `[t3]`.
- **verdict:** —
