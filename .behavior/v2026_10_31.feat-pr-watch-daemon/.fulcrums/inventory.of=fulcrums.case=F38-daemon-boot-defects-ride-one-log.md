# F38 — the daemon's boot defects ride one stream, its log

## .the fork

5.3 i003 peer lane r1 (repo-rules) reads `rule.require.skill-output-streams` onto
`git.pull.watch.daemon.sh`: its boot-defect lines print to stdout alone, its `a key is required`
guard to stderr alone.

- (a) keep one stream: the daemon is no caller-faced skill. the findsert spawns it with stdout and
  stderr both appended to `daemon.log`, and the boot check reads the last `boot defect:` line of
  that log as the cause it reports (sessionstart hook, `set`)
- (b) mirror each line to both streams: each defect lands twice in `daemon.log`, so the cause the
  hook and `set` print reads from a log that doubles every boot line

## .taken, why

(a). the two streams are one file. a mirror adds no reader and doubles the log the cause is read
from. no human runs the daemon; `set` and the boot hook speak its faults on both streams.

## .rework

clean: a `say_both` in the daemon, and a dedupe in the cause read, if a caller ever runs it bare.

## .confidence

85%: the rule's scope names every executable under `skills/`; the daemon is one, by path.

## .where

`src/domain.roles/mechanic/skills/git.pull.watch/git.pull.watch.daemon.sh` boot guards.
