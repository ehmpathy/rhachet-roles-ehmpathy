# F10 · dispute: "case=9's bdd [tn] is truncated"

- fork: concede and rewrite a sketch that exists · dispute as a reviewer misread
- taken: dispute. the case=9 file holds a closed `ts` fence with three `given` blocks (case9, case9b, case9c), each with a `when` and `then` steps. the same lane read case=6 as truncated in round 2, and the other lane read case=5 the same way (F9)
- evidence, both ends:
  - **the file** — `tail -24 1.vision.experience.case=9.stale-daemon-is-replaced.md` (2026-10-31) prints all three `given` blocks and the final fence
  - **the reviewer's input** — the round-3 prompt, `.log/bhrain/review/2026-10-31T14-38-53-469Z.pid2327220.5ded7b5c-b0ce-4957-a135-8547df536b15/input.prompt.md`, holds the case=9 target at line 1328 and `given('[case9b] a live pid whose heartbeat is 3+ intervals old'` at line 1361. the brain was fed the full sketch and reported it absent
- so the cause is the reviewer brain's read, not the artifact and not the input. a reseed for the reviewer's owner is a dream, not this route's work
- rework: clean — no edit would answer it; the sketch exists. this round did extend case9c (spawn + catch-up after a reused pid), per a valid nitpick on the other lane
- risk: low — a review disposition; no credential, no prod write
- confidence: 97%
- where: experience-coverage r3 blocker.1
- verdict: (open; council)
