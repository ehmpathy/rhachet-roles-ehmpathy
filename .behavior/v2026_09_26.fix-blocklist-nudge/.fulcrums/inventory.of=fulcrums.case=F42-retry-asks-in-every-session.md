# F42 — a retry hands an ask to the human in every session, attended or not

## .the fork

- **detect headless:** the hook senses an unattended caller and, on a retry, keeps the block
  (or bounds the ask) instead of `permissionDecision: "ask"`
- **hold:** a retry within the window always becomes an ask; what an ask does in an unattended
  session is the harness's contract

raised by peer review i014 (enroll-impl-arch-defects, nitpick.4, graded `urgent` by the reviewer).

## .taken — hold, and why at the time

- the ask IS the wish's bust-through: *"the ones that were asked twice to bust through to
  approval"* — the vision routes an unchanged retry to the human on purpose (case=4)
- the hook has no honest signal for "unattended": every PreToolUse hook runs with no TTY, so a
  TTY check would read every session as headless and remove the bust-through for all of them
- claude code owns what an ask does where no human answers (its permission mode decides —
  prompt, deny, or allow); a second policy in the hook would fork that contract
- the retry is the bot's own deliberate choice, and the nudge says so: *"need this exact command
  once? retry it unchanged — that interrupts the human to ask"*

## .severity

graded `better` here: no shipped harm has a name — an unattended session that meets an ask
gets the harness's own answer, the same as for any un-allowlisted call it makes with no hook at all.

## .rework

**clean** — a mode flag on the hook registration (`--mode` already exists) could opt an
unattended clone out of the ask, if the harness ever exposes the signal.

## .confidence — 80%

## .where

`pretooluse.check-permissions.sh` (`is_retry_in_window`, the ask payload); vision case=4
