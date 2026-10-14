# F17 — a nudge-record fault blocks (exit 2), every attempt, until fixed

- **fork**: (a) a config dir that cannot hold the nudge record blocks each attempt with a
  `💥 MalfunctionError` and its fix · (b) it exits 0, so claude's own prompt takes over
- **taken**: (a). this repo's rule `rule.require.qualified-error-headers` states it for PreToolUse
  hooks: "a malfunction in a PreToolUse hook must still exit 2, or the gate it guards fails OPEN",
  and its enforcement lists "a PreToolUse hook that exits 1 on a malfunction = blocker". peer r002
  (mech-failhides) raised the exit-1 path as a failhide in i001. the fault is loud, names its cause
  and fix, and the cases that reach it are misconfigurations claude itself never produces: an
  absent config dir, a read-only one, a path under a regular file
- **the cost, stated**: under (a) an unlisted command cannot reach claude's prompt while the fault
  stands; the human fixes the dir, then the retry passes as usual. under (b) the clone loses the
  nudge, which is all the hook adds, since claude still prompts. peer r010 (i005) argues for (b):
  behind this hook a "permit" means "claude prompts", so (b) is not a security hole. the argument
  is sound; (a) follows the repo rule as written, and the wisher may rule for (b)
- **the split, if (b) wins (peer r011, i006)**: exit 0 applies only at the nudge-record step, where
  the command is already known to be unlisted. the lib-load fault (`[case19]`) keeps exit 2, since
  there the verdict is unknown and an allowlisted command is as likely as not. peer r010 (i006)
  adds a third shape: exit 0 with a PreToolUse `permissionDecision: "ask"` and the fault as the
  reason, unverified against claude's docs. peer r010 (i010) sides with (b) at the nudge step
- **rework**: clean — two `exit 2` lines become `exit 0` plus stdout guidance; four snapshots
- **confidence**: 70% — the rule's premise ("the gate fails open") fits a deny gate better than a
  nudge
- **where**: `pretooluse.check-permissions.sh` (prepare and update faults); `[case4][t2]`,
  `[case16]`, `[case17]`, `[case19]`; peer r010 i005 blocker.1
- **verdict**: settled by main — #917 (`702876d`) ships (a): every nudge-record fault, named
  via its record malfunction line, blocks with exit 2. the rebase keeps main's code; this branch
  adds only the config-dir remedy text (F26)
