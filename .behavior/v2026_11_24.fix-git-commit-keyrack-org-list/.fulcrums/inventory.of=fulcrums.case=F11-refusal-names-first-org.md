# F11 — a multi-org refusal: name the first refuser, or every refuser, or hint `@all`

## .fork
under F1 every listed org must allow. when several refuse, the gate stops at the first in list order and prints its `allow --org <org>`.
- (a) name the first refuser, with the list tree (`org: lists a, b` · `every listed org must allow commits`)
- (b) name every refuser and an allow line per org
- (c) add `or: git.commit.uses allow --org @all`

## .taken
(a). (c) widens the grant past the listed orgs to every org on the machine; a refusal must not teach a broader grant than the repo asks for (`rule.require.safe-by-default`). (b) is sound and is caught in the F10 dream: it reshapes the refusal leaf and its consumers. the list tree tells the human more orgs are gated, so a second refusal is expected, not a surprise.

## .rework
clean. `check_org_blocker` collects refusers in one loop; the render prints N lines.

## .confidence 75%
a human with three unset orgs pays three retries under (a).

## .verdict
best-guessed
