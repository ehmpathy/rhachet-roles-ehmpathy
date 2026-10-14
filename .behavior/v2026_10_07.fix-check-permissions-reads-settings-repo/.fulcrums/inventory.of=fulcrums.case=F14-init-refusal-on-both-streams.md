# F14 — the init's link refusal goes to both stdout and stderr

- **fork**: (a) emit the `✋ ConstraintError` link refusal to stdout and stderr · (b) stderr only
- **taken**: (a). this repo's own rule, `rule.require.skill-output-streams`, says it outright:
  "on errors, output must also go to stderr" and "error output without stdout = blocker". its
  table: validation error → stdout yes, stderr yes. the init's other output (the tree of what it
  applied) lives on stdout, so a stdout reader who sees the run stop must see why. the dual write
  is two `echo`s rather than `| tee /dev/stderr`, since `/dev/stderr` is absent under some spawn
  contexts (seen in the test runner: "No such device")
- **rework**: clean — drop one line, resnap two snapshots
- **confidence**: 90%
- **where**: peer review r004 (arch-opport-decomposition) i003 nitpick.4; r009 (ergo-friction-hazards)
  i003 nitpick.2; r006 (arch-hazards-maintenance) i003 nitpick.2
- **verdict**: —
