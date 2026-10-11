# F30 — the one-pass `@tsv` stdin read across six gates stays dreamed

## .the fork

- **pull it in:** each of six gates reads `.tool_name` and `.tool_input.file_path` in two jq
  execs; one `jq -rj '[…] | @tsv'` pass reads both, as the forbid-terms hooks already do
- **defer it:** keep the per-field reads in this round; the dream holds the shape

## .taken — defer, and why at the time

the walk half of the same dream landed (three hooks, clamped). the stdin half is a different
kind of change: each gate's first jq read is also its parse-failure probe —
cross-repo-access and shouted-readme fail OPEN, loud, on any nonzero status (just fixed and
clamped); the others fail closed. a one-pass read moves that probe into a process
substitution whose exit status `read` swallows, so each gate would need its failure path
rebuilt and re-proven. that is six gates' security posture, not a fork count.

## .rework

**dirty** — six gates, each with its own suite, and two of them gate every Read and every Bash
call. reversal after later work builds on the new read is a teardown of six parse paths.

## .confidence — 85%, and why it is not higher

the wisher said "pull em all in". the deferral rests on a judgment that a parse-path rewrite
across six gates is unsafe to ride along; a wisher who weighs the fork savings higher would
overrule it.

## .where

`.dream/v2026_09_11.fix.four-peer-hooks-still-fork-per-parent-dir.md` (status note at top)

## .verdict

open
