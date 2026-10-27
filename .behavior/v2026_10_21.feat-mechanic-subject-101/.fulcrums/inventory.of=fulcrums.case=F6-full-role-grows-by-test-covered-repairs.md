# F6 — the full role grows by one brief: test-covered-repairs moves ref → say

## the fork

measured after the edit (built, `roles cost --repo ehmpathy --role mechanic`): the full role reads
28,466, up from 27,758 (+708). every prior subject reads its baseline. the cause: a full-role boot
absorbs every subject; `subject.flow` holds `test-covered-repairs` at ref, and `subject.101` says it,
so the full boot now says it too (`computeBootPlan.js:114-119` — a say claim wins over a prior ref).

two instructions now pull apart:
- wish item 5: "no change to the full role or to its other subjects"
- the wisher's answer to Q3: keep `test-covered-repairs` at say in 101

options:
- A. keep it at say in 101; the full role grows +708, still under its 30k cap.
- B. move it to ref in 101; the full role returns to 27,758; the Q3 answer is overturned.
- C. condense a `.min` twin first (F2); the growth shrinks but stays above zero.

## taken, and why

A. the Q3 answer is the later, explicit word on this exact row; item 5's aim (protect the full
role's budget) still holds at 28,466 / 30,000. the growth is one rule the full role already held at
ref, now read in full.

## rework

clean — one line moves from say to ref in `subject.101`.

## confidence, and why it is low

75%. item 5 reads literally as "no change", and the full role is the hardest-pressed boot (95% of
its cap after this edit).

## where

`src/domain.roles/mechanic/boot.yml`, `subject.101.briefs.say`.

## verdict

**ruled B** by the efficiency director, 2026-10-21: "move test-covered-repairs to ref in 101; the
goal is a cheaper boot, and the rework is clean."

applied:
- `subject.101` says seven rules; `test-covered-repairs` rides at ref, with a comment on why
- the pin test in `boot.yml.integration.test.ts` reads seven say + seven ref
- a class clamp: `not say in subject.101 a brief another section holds at ref` — proven red with
  the row back at say, green with it at ref
- full role, measured after: 27,913 (from 28,466; −553). the +155 still above the 27,758 baseline
  has a different cause — see F7
- boot suites 47/47 green
