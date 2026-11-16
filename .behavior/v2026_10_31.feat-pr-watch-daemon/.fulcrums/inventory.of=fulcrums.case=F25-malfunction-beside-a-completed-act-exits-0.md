# F25 — a malfunction beside a completed act: exit 0, or exit 1

## .the fork

two surfaces print a `💥 MalfunctionError:` block and exit 0:

- `git.pull.comment.set`, when the comment posted and only the pr-watch ledger write faulted
- the SessionStart hook `sessionstart.git-pull-watch.sh`, when it could not findsert the daemon

`rule.require.exit-code-semantics` maps a malfunction to exit 1. `rule.require.qualified-error-headers` requires the class on every human-read error.

- (a) exit 1, to match the class
- (b) drop the class and word each as a note, to match exit 0
- (c) keep the class and exit 0: the act the caller asked for completed; the class names who must fix the side fault

## .taken, why

(c).

- the comment set: the comment landed. exit 1 tells a composer the set failed, so it may re-post or abort on a success. a keyed rerun is a no-op that never retries the ledger, so exit 1 buys no recovery. the json result now carries `ledgerFault`, so a composer that parses stdout sees the fault with no exit code needed
- the hook: a SessionStart hook must never fail the session. the session is the act; the daemon is a side service. exit 1 earns naught from claude code but a hook error
- (b) would hide the fault class: a reader scans for `MalfunctionError` to learn the system owes a fix, and both faults are system-side (a write fault, a dead daemon)

## .rework

clean: one `exit` line per surface, plus its test.

## .confidence

80%. the two rules disagree on this edge; the call rests on which contract the caller reads (the act vs the side fault).

## .where

`src/domain.roles/mechanic/skills/git.pull.comment/git.pull.comment.set.sh` (ledger block) · `src/domain.roles/mechanic/inits/claude.hooks/sessionstart.git-pull-watch.sh`. raised as r002 nitpick.1 and nitpick.2 (5.1 i002).
