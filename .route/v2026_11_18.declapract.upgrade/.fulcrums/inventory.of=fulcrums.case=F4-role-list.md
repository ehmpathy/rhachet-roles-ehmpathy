# F4: keep the template role list, which drops `dreamer`

## .fork
upgrade set `prepare:rhachet` to the template role list: adds librarian, learner, achiever, telepath, operator, observer, deployer, playwright, enroller; drops `dreamer` (the `catch.dream` skill). options: keep the template, or add `dreamer` back.

## .taken
keep the template. the rhachet practice checks `prepare:rhachet` via `FileCheckType.CONTAINS` on the full string, so an added `dreamer` fails the check and the next upgrade reverts it. the org template omits it by intent.

## .rework
clean — one word in one package.json command, if the practice upstream admits it.

## .confidence
80%. why low: driver briefs cite `catch.dream`; a fresh clone loses that skill.

## .where
package.json `prepare:rhachet`

## .verdict
unruled
