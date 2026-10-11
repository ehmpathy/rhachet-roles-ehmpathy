# F34 — the peer PreToolUse hooks keep their block render on stderr only

## .the fork

- **extend F11 family-wide:** every PreToolUse hook (planmode, sedreplace, stderr-redirect,
  suspicious-syntax, test-background, tmp-writes, forbid-terms ×2, the hardnudge lib) emits its
  block and malfunction render on stdout AND stderr, as check-permissions does
- **hold F11 at its ruled scope:** the wisher's F11 verdict named `pretooluse.check-permissions.sh`
  ("where:"); the peer hooks keep stderr only until the wisher rules the family

raised by peer review i003 (repo-rules, blocker.1).

## .taken — hold, and why at the time

the wisher ruled F11 for one hook; the family is a call that verdict reserved. the extension is
not a fix-forward: it reaches seven hooks this route does not otherwise change, and their suites
pin stderr-only as a design (~100 `stdout === ''` assertions on block paths across
forbid-test-background, forbid-tmp-writes, forbid-shouted-readme, suspicious-syntax,
stderr-redirect, forbid-terms). best guess for the council: the wisher, who overruled toward both
streams once, would rule the same for the family.

## .rework

**dirty** — mechanical per hook (route each `} >&2` block through a both-stream emit), but it
ripples into every peer suite's stream assertions and their snapshots.

## .confidence — 75%, and why it is low

the wisher's F11 direction points the other way; this hold rests only on F11's stated scope.

## .where

`.dream/v2026_10_07.fix.peer-hooks-render-blocks-on-both-streams.md` · F11

## .verdict

open
