# F14 · the real-api case ships red, by the director's call

## the fork

- **taken:** ship `git.pull.comment.real.integration.test.ts` as the one known red. no keyrack ask is filed. the case fails loud on the absent token (`ConstraintError` + unlock hint), never skips
- **not taken:** obtain `EHMPATHY_SEATURTLE_GITHUB_TOKEN` before merge, or hold the pr until it lands

## why, at the time

not the driver's call. the director decided it, verbatim: "the real-api case stays red by design: the github token is barred by bulletin auth-as-human-stopgap, so no keyrack ask." the bar is a fleet-wide credential decision above this route. `rule.always.spend-own-levers-before-escalation` files a credential the keyrack reports absent under **human**. here the human has weighed that lever and declined it.

what the driver could do without the token, it did:
- the case exists, runs, and fails loud, so the gap is visible on every run, never hidden
- the masked live snapshots and the pr-body round trip are written, so the first run under a token proves the whole real contract at once
- the stub suite (168 cases) proves the contract's logic against a stateful stub gh
- live walks under `--auth as-human` on #1039, plan mode, showed each read path and plan verdict against real github (pasted in the 5.3 self reviews)

## rework

clean. once the bar lifts: unlock the token, run the case, commit the snapshot it writes. one live case is owed then: a thread reply (POST `…/comments/{root}/replies`, a reply to a reply that joins the root, a keyed upsert in the thread), on a home-org pr that holds a review comment. it needs the token to write, so it waits on the same bar.

## confidence: 95%, and why it is not higher

the director's words are explicit. the 5% is the reviewer's point: a merge with a red real case leaves the live write paths (POST, PATCH, DELETE under the bot token) unproven until the bar lifts.

## where

5.3.verification, peer review i001 (r3 blocker.2, r4 blocker.3); i004 (r10 blocker.2, the live thread reply).

## verdict

decided by the director (2026-10-24): stays red, no keyrack ask.
