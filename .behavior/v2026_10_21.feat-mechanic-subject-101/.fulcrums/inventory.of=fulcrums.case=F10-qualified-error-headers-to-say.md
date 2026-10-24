# F10 — `qualified-error-headers` moves to say in 101

## the fork

F4 (wisher) placed `qualified-error-headers` at ref in 101. at 5.1 i006 both l3 lanes named a harm:
the say cue `exit-code-semantics` states `MalfunctionError → exit 1` flatly; the exception — a
malfunction in a PreToolUse hook still exits 2 — lives only in `qualified-error-headers`. a director
who cures a PreToolUse hook from the say cue exits 1 on a malfunction, and claude code reads exit 1
as permitted: the gate fails open. the wish names that harm as the reason for the exit-code row
("a wrong code fails a PreToolUse gate open").

options:
- A. say `qualified-error-headers` in 101.
- B. keep it at ref (F4 as placed); the cue stays incomplete.

## taken, and why

A. the harm is behavioral and named, and the wish's own argument for the exit-code row needs the
exception beside it. cost: slice 2,497 → 2,884 (cap 10,000); full role 27,913 → 27,913 — code.prod
already says it, and the move swaps a ref-roster row for a say-claim roster row of the same size.
the class clamp (no 101 say row held at ref elsewhere) stays green.

## rework

clean — one line back to ref, plus the pin test.

## confidence, and why it is low

85%. it overrides a wisher placement (F4) on a reviewer's harm argument, not a wisher re-ask.

## where

`src/domain.roles/mechanic/boot.yml` `subject.101.briefs.say`; pin test in
`boot.yml.integration.test.ts`.

## verdict

best-guessed: A, per the director's order ("a fulcrum call with a defensible best guess and a clean
rework is never a --as blocked: guess, record, drive on"). for the director's review.
