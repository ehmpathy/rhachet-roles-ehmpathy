# F4 — no secret-shaped body refusal

- fork: A. out of this pull · B. refuse a body with a token-shaped value
- taken: A. #1165 does not ask for it; p0 favors the narrow pull
- rework: clean. B is one check in `description set` plus a case
- confidence: 80%. a leaked secret costs far more than the check; the commander may want B
- where: `git.pull.description.set.sh`
- verdict: overturned to B (commander, #1173 review, vision line 100: "in, we should block secrets").
  both set verbs refuse a title or body with a secret-shaped value before any gh call
  (`check_pull_text_holds_no_secret`, `git.pull/git.pull.operations.sh`); the refusal names the
  shape and line, never the value. demo: case 11
