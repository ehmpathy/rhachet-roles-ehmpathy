# F30 — eight questions that change what the watch says: held for the commander

## .the fork

r010 (5.1 i004–i006) raises eight gaps whose fix changes what an alert, `set`, or the push says to the clone. each is a what, not a how, so none is best-guessed; each waits on the commander. the behavior as built holds the vision's own shape for each.

| q | the question | options | lean |
|---|---|---|---|
| Q-a | a comment excerpt from an author with no write access: show it, mark it, or point to `git.pull.comment get` only | (a) show as now · (b) show, marked `(untrusted)` · (c) no excerpt for such authors | (b) |
| Q-b | a pr the token cannot read (404, a mistyped `--pr`): does `set` refuse it, and does the daemon alert once on a fault that lasts | (a) silent hold as now · (b) `set` reads the pr first and refuses; the daemon notes a fault past the outage bound | (b) |
| Q-c | a ci alert's `next:` for a failed check outside the `test` workflow, or for a pr whose branch or repo differs from the clone's cwd | (a) `rhx show.gh.test.errors` as now · (b) name the check's own workflow, the pr's branch, and its repo: `--flow <name> --branch <head.ref>`; approval's `git.release` names the pr too | (b) |
| Q-d | legacy commit statuses (not check runs) | (a) check runs only, as now · (b) read statuses too, as `git.release` does | (b) |
| Q-e | a noisy bot's comments | (a) alert each, as now · (b) a per-watch mute by author | (a) for now |
| Q-f | a check run that ends `cancelled`, `timed_out`, or `action_required` (a cancel is often the clone's own push that superseded the run) | (a) alert each as `ci failed`, as now · (b) alert only `failure` and `timed_out`; a cancel stays quiet | (b) |
| Q-g | an approval with a body ("approve, but rehearse the migration first") | (a) approval names author, ci, and next only, as now · (b) the approval shows its first line as `says:`, cut with `…`, plus the `read:` of the body whole | (b) |
| Q-h | the push still ends with `rhx git.release --watch`, and `rule.require.watch-release-after-push` makes that foreground watch a blocker; a clone that obeys both never idles, so the daemon's ci alert lands stale | (a) both as now · (b) a watched push says the daemon watches ci, and the rule names the daemon as its cure for pr events · (c) the release watch stays, the daemon alerts only comments and approval | (b) |

the control-byte half of r010 blocker.4 is a how, and is fixed: every github string is cleaned before render, with a clamp. Q-a is the trust half.

the 🐢 spoof (r010 i006 #1) is a how on the trust half, and is fixed: `(clone)` needs proof (a ledger id on this box, or a 🐢 from a bot or a login a ledgered comment proves), with a clamp. what an untrusted excerpt says stays Q-a. `--auth as-human` pushes (r010 i006 #6) fold into Q-b: a repo the token cannot read is the same silent hold.

## .taken, why

held. the vision asked for the excerpt (A2), the fixed `next:`, check runs, and an approval that names the next move; none of these eight is in it. a change to any is the commander's call.

## .rework

clean for each: alert transformers and one `set` read, plus snapshots.

## .confidence

n/a: not decided here.

## .where

`git.pull.watch.alert.sh`, `git.pull.watch.daemon.sh` (`WATCH_DIFF_JQ`), `git.pull.watch.set.sh`. raised as r010 blocker.4 (trust half), nitpick.1, nitpick.2 (workflow half), nitpick.5, nitpick.8 (5.1 i004); Q-c widened, Q-f added, and Q-b's `get` half by r010 nitpick.2, nitpick.5, nitpick.6 (5.1 i005). Q-g and Q-h added by r010 blocker.2 and item 4 (5.1 i006); the push half of Q-h sits in `git.commit.push.sh`. Q-b's visibility in `get` waits on its answer: what `set` refuses decides what a persistent read fault must say.
