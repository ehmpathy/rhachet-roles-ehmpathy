# F40 — a comment excerpt drops whole control sequences, and keeps the words apart

## .the fork

events case2d pinned `'says: [31mwipeout[0m onthe reef'`: the old `clean` stripped the escape
byte alone, so `[31m` and `[0m` stayed as text, and a tab vanished so two words ran together.
a 5.3 peer round on control bytes in alert text replaced it.

- (a) keep the old pin: a reader sees `[31m` fragments and a fused `onthe`
- (b) drop each whole ansi or c1 sequence, map a tab to a space, then drop any other control
  byte: the excerpt reads `says: wipeout on the reef`

## .taken, why

(b). the test's intent is that no control byte reaches `clone say` and the words survive. (b)
meets both; (a) met the first and broke the second. the new pin is stricter: it adds
`not.toContain('[31m')`.

## .rework

clean: one jq def, `clean`, in `WATCH_DIFF_JQ` of `git.pull.watch.daemon.sh`.

## .confidence

95%: the prior pin recorded a defect, not a contract.

## .where

`git.pull.watch.daemon.sh` `WATCH_DIFF_JQ` `def clean`; `git.pull.watch.events.integration.test.ts`
case2d.
