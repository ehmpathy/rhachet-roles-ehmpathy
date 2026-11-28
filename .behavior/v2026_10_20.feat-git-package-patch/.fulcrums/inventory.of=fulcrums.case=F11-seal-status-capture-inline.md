# F11 — the seal's exit status is captured inline

## .the fork

a reviewer (mech-decode-friction, i003 nitpick.2) asked that `PNPM_STATUS=0` +
`PNPM_OUT=$(set_patch_via_pnpm ...) || PNPM_STATUS=$?` move behind a name.

- **A** — a helper that returns the seal's output and its status
- **B** — keep the one capture inline in `commit.sh`

## .taken: B, and why at the time

the seal yields two values: pnpm's words (the refusal detail) and its status (which path runs). a
bash function returns one stream and one status; a helper that hands back both must either print a
status line for the caller to split (a decode at the call site) or set a caller variable by name
(the same capture, one hop away). the commit path needs both values after the call, since a failed
seal must still put the prior patch back before it reports. the capture is one line, used once.

## .rework: clean

one communicator plus one call site, if a cleaner bash idiom turns up.

## .confidence: 80%, and why it is low

a reader new to bash may still need a beat on `|| VAR=$?`; the next line names its use.

## .where

- `git.package.patch.commit.sh` — the seal, gate 8

## .verdict

open
