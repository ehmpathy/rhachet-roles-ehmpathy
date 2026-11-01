# F3 — what counts as "gh refused the bot"

## .the fork
`is_gh_auth_failure` matches 401 / bad credentials / not logged in, not 403. caseB names 403 and "not accessible by integration". options: (a) a new predicate `is_gh_bot_refusal` = auth signatures + `http 403` + `not accessible by integration`; (b) widen `is_gh_auth_failure` itself; (c) any non-zero gh exit.

## .taken, why
(a). (b) would also send the extant as-human path to the re-auth guide on a 403, which is wrong (a 403 under the human login is a permission fact, not a login gap). (c) would retry on a protected branch or a rate limit and hide the real cause.

## .rework, why
clean. one leaf predicate in `keyrack.operations.sh`.

## .confidence, why low
85%. a 403 can mean the bot lacks repo write while the app IS installed; a retry as-human is still the right move there, so the risk is small.

## .where
`keyrack.operations.sh:136`.
