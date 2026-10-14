# F21 — the decide audit log lives in the clone's config dir

- **fork**: (a) `permission.decisions.local.log` lives in the config dir (`$CLAUDE_CONFIG_DIR`, else
  the walk-up dir) · (b) it stays in the walk-up dir for every clone · (c) it is written to both
- **taken**: (a). the approved vision places it there: case 11 ("the audit log lives in the config
  dir") and cell #37, which the wisher approved with the vision. the nudge record moved with the
  same rule, so one actor's two hook records sit side by side. the boot list names the full path
  when the config dir is not the walk-up dir, so a human can find it
- **the cost, stated (peer r010, i006)**: the trail of a repo with several actors spreads across
  each actor's dir. (c) would keep one repo-wide trail, at the price of a second write per decision
  and a file another actor's clone writes into
- **rework**: clean — one path expression in `audit_decision`; a flip changes it and decide
  layers `[t4]`
- **confidence**: 85% — the placement is approved; whether a human finds the per-actor log at need
  is a 5.3 check (yield ".open, for 5.3")
- **where**: peer review r010 (enroll-impl-behavior-intent) i006 item 4; pinned by
  `permissionrequest.decide-permissions.layers.integration.test.ts` `[t4]`
- **verdict**: —
