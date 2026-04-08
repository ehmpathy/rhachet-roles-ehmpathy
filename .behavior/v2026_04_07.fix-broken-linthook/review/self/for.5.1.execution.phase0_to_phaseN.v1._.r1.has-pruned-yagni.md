# self-review r1: has-pruned-yagni

## the question

did we add extra components not explicitly requested in the vision, criteria, or blueprint?

## the review

### what was requested

from the wish:
1. create `rhx git.repo.test --what lint`
2. log stdout/stderr to `.log/role=mechanic/skill=git.repo.test/$isotime.{stdout,stderr}.log`
3. stdout only the summary with vibes, not raw lint output
4. exit code 2 to force brain to address defects
5. replace the `pnpm run --if-present fix` hook

from the blueprint:
- parse args (--what, --when)
- validate --what lint (only lint supported for now)
- validate git repo context
- validate package.json
- findsert log directory
- findsert .gitignore with self-ignore
- generate isotime filename
- run npm test:lint with output capture
- parse defect count
- emit turtle vibes summary
- exit with semantic code (0/1/2)
- replace pnpm fix hook in getMechanicRole.ts
- add permissions for skill

### what was implemented

| component | requested | verdict |
|-----------|-----------|---------|
| git.repo.test.sh | yes (wish, blueprint) | required |
| --what lint parse | yes (blueprint) | required |
| --when parse | yes (blueprint, "for future use") | required |
| git repo validation | yes (blueprint) | required |
| package.json validation | yes (blueprint) | required |
| log directory findsert | yes (wish, blueprint) | required |
| .gitignore findsert | yes (blueprint) | required |
| isotime filename | yes (wish, blueprint) | required |
| npm test:lint execution | yes (blueprint) | required |
| defect count parse | yes (blueprint) | required |
| turtle vibes output | yes (wish, blueprint) | required |
| exit codes 0/1/2 | yes (wish, blueprint) | required |
| integration tests | yes (blueprint) | required |
| permissions update | yes (blueprint) | required |
| hook replacement | yes (wish, blueprint) | required |

### extras not requested?

none found. every component traces back to either:
- the wish
- the blackbox criteria
- the blueprint

### potential yagni concern: --when flag

the `--when` flag was specified in the blueprint as "for future use" but isn't used yet. however:
- it was explicitly in the blueprint
- it takes zero extra code to parse (same pattern as --what)
- it doesn't add complexity

verdict: not yagni — explicitly requested, minimal cost.

### potential yagni concern: malfunction detection

the npm error detection (check for "npm ERR!" in stderr) was added in implementation to distinguish between:
- lint failures (exit 2) — user fixes lint errors
- npm failures (exit 1) — system issue

this was required by the blueprint's exit code semantics:
- exit 0 = passed
- exit 1 = malfunction
- exit 2 = constraint

verdict: not yagni — required to implement specified exit code semantics.

## verdict

no yagni found. implementation is minimal and traces to requirements.

