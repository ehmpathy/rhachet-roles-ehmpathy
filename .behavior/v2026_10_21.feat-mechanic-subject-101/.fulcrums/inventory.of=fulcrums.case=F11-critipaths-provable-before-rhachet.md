# F11 — what 5.3 can prove of the director critipaths before rhachet ships `::`

## the fork

case 1 (a director boots `mechanic::101`) and its cells c6, c12 are critipaths. a seat cannot
enroll `mechanic::101` until rhachet ships the `role::subject` enroll (F1). at verification,
`rule.require.experience-catalog-evolution` makes a critipath with no real test a blocker.

options:
- A. scope the 5.3 proof of case 1 to what this repo controls: the slice cap
  (`boot.budget` — ≤ 10k, section alone), the exact pin and the hooks-on-role pin
  (`boot.yml.integration`), and the `--subject 101` boot test (every 101 say row boots as a
  `<brief.say>`). the enroll leg is proven in the rhachet tree, where `::` lands.
- B. hold 5.3 until rhachet ships `::`.

## taken, and why

A. every part of case 1 that lives in this repo has a real test; the enroll leg is not code here.
B blocks this pr on another repo's release with no change owed here.

## rework

clean — once `::` ships, add an enroll test to case 1's proof.

## confidence, and why it is low

75%. a 5.3 reviewer may read the enroll leg as the critipath itself.

## where

`5.3.verification`, case 1 / c6 / c12.

## verdict

best-guessed: A.
