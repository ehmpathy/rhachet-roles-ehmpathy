# F22 · the reply journey is proven by integration and the live tier, not a new acceptance suite

## .the fork
- (a) prove the journey as every pr-watch journey on main is proven: the integration suites run the shipped scripts end to end, with stubs at the two remote edges (github, a live clone's `say`), plus the opt-in live tier (`TEST_LIVE=github`) and the Q1b live probe
- (b) add a `.acceptance.test.ts` for the reply-task journey

## .taken
(a).
- an acceptance test here may not mock (`rule.forbid.acceptance.mocks`). the repo's acceptance tier (`blackbox/`, 17 suites) runs the built skill via rhachet, and its two pr-watch suites (`git.pull.watch.acceptance.test.ts`, `sessionstart.git-pull-watch.acceptance.test.ts`) stop short of github and the daemon by design: they prove the dispatch road (help, refusals, `get`, `del`, `set` slips, the files a daemon boots from). every alert journey on main (ci failure, comment, approval) sits in the integration suites. the reply journey follows that seam
- the reply journey crosses github and a live brain: a no-mock run needs a real pr, a real human comment, and a live clone. that is the live tier, which exists and is gated on a human-held key
- an acceptance suite on stubs would be the integration suite again, under a name the rule forbids it to hold
- what this pr adds to the dispatch road is acceptance-proven: `set --help` names reply tasks, and the acceptance snap holds that line (`blackbox/__snapshots__/git.pull.watch.acceptance.test.ts.snap`)
- a *live* masked acceptance run cannot be authored by the crew alone: the daemon raises a reply task only for a trusted human who is not the crew. every login a test harness can post as is one the system refuses by design — a crew login, a ledgered comment, a bot. so a live run must post a review comment, on a real pr, as a human's own login, and must deliver to a live clone. that posts to github as a person, which only that person may grant

## .the counter-argument, stated fairly
`rule.require.acceptance-journey-coverage` asks one acceptance test per user journey, with snaps. this pr adds a user journey, and "the tier holds none yet" is not an exemption. the rule's own cure is a live journey with its volatile bytes masked, which a sandbox pr and a human's grant would make possible.

## .where
- `5.3.verification.yield.md` → tests executed, row `acceptance`
- the journey's proof: `git.pull.watch.replies.integration.test.ts`, hook suites, `git.pull.watch.github.real.integration.test.ts` (live tier), the Q1b probe

## .rework
clean. an acceptance suite would be additive: no prod code, no test moves. it needs from a human: a sandbox pr to post on, a grant to post a review comment as that human's login from a test, and the test-env key filled (`rhx keyrack set --owner ehmpath --key EHMPATHY_SEATURTLE_GITHUB_TOKEN --env test --vault <vault>`).

## .confidence
75%. the no-mock rule and the remote edges point to (a); the journey rule, read to the letter, points to (b).

## .verdict
open — for the foreman at the end.
