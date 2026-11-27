# F14 — the hint's proof surface: integration via the gh stub, real-api by hand, acceptance for help and refusals

## .the fork
where each hint journey is proven. options: (a) the integration suite proves every journey against the gh stub; the real-api suite proves the stub matches github and runs by hand; the acceptance suite (blackbox, via rhachet) proves help and refusals; (b) add hint journeys to the acceptance suite as well, and snap every odd row shape (empty first line, null author, 10+ rows).

## .taken, why
(a).
- the acceptance suite holds no gh stub. a hint journey there needs a live pr and a write scope, which is what the real-api suite already holds
- the real-api suite is excluded from ci by contract: it writes to a live pr, and a test job holds no write scope
- odd rows ride on jq defaults: an empty first line renders `""`, a null author renders `?`. both are visible in the jq source, and neither changes the row's command
- 10+ rows is the vision's itemized, intentional growth of a reply round

## .rework, why
clean: an added case in either suite breaks no contract.

## .confidence, why low
70%. a reviewer can fairly want a blackbox journey for the critipath.

## .where
`git.pull.comment.integration.test.ts`, `git.pull.comment.real.integration.test.ts`, `blackbox/git.pull.comment.acceptance.test.ts`
