# F24 — the title and description renders changed under peer review, after the first push

- fork: A. keep the review-driven layout, recorded · B. revert to the layout the pushed head
  (`b1980de`) locked
- taken: A. each change answers a peer blemish raised on this stone, and each tightens rather than
  loosens what a test pins:
  - description set: `url:` lifts from inside `current` to a peer row (5.3 r6 i001 / i002), as the
    title verb already had it
  - plan text indents 5 columns under `│`, aligned under its `└─ text` leaf, not 8; three regexes
    moved `{8}` → `{5}`, each still an exact width
  - both gets render `author` before `url`, the order both sets use (5.3 r11 i003 n4)
  - the no-op repair line reads `already applied (the pull holds this body, repaired)`, not
    `none: the pull already reads so` (5.3 r11 i003 n5, i005 n2: "none" denied a repair the file
    still needs)
  - the description over-cap refusal names the footer its count includes (r11 i004 n1)
  - the foreign-author hint under `@stdin` adds `; pipe the same body in again`, and names the
    plan it previews: `: plan, then add --mode apply` (r11 i004 n3, i005 n5)
  - the `--to` help states its limits as one sentence (r11 i004 n5); both `--output` helps say how
    to read json through rhx, not only text (r11 i005 n1)
  - both gets show `state`, and a set on a merged pull adds a note that the squash commit is
    already written (r11 i005 n3)
- why it holds: the verbs are unreleased; the pushed head is this pull's own work in progress, not
  a contract a caller holds. a revert restores blemishes two reviewers flagged
- rework: clean. echo order and one indent string per verb, then a resnap
- confidence: 85%. the reviewer (5.3 r12 i004 blocker.2; i005 blockers 7–11) graded each `better`
  and asked for a sign-off; a second reviewer (r11) asked for each change. two lanes that demand
  opposites is the council's call
- where: `git.pull.title/git.pull.title.get.sh`, `git.pull.description/git.pull.description.get.sh`,
  `git.pull.description/git.pull.description.set.sh`
- verdict: open, for the pr review
