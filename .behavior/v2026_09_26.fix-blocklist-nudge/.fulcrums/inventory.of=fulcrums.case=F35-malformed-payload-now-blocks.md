# F35 — a malformed PreToolUse payload now blocks in the forbid-terms gates

## .the fork

- **keep the pin:** a non-empty payload jq cannot parse exits 0 (a silent permit), as a prior
  route pinned (its acceptance #2: "no policy move, either direction")
- **block, loud:** exit 2 with `💥 MalfunctionError: PreToolUse payload is not valid json (<jq
  cause>)`, as check-permissions already does (its case45)

raised by peer review i003 (mech-failhides, blocker.1); first flagged as an open question in
this stone's has-pruned-backcompat review.

## .taken — block, and why at the time

the prior pin bound a behavior-neutral refactor (cut the fork storm), so it barred policy moves
in that route. this route moves policy on purpose: the lib that holds the read is new here, the
same route made check-permissions block on the same input, and `rule.forbid.failhide` grades a
blanket `2>/dev/null || echo ""` as a mega blocker. claude code always sends valid json, so no
live write changes verdict — only a hand-run probe does.

## .rework

**clean** — one `if` in `set_hardnudge_payload`, and the two pinned cases (gerunds `[case18]`,
blocklist `[case22]`) flip back.

## .confidence — 90%

## .where

`src/domain.roles/mechanic/inits/claude.hooks/_hardnudge.lib.sh` (`set_hardnudge_payload`)

## .verdict

open
