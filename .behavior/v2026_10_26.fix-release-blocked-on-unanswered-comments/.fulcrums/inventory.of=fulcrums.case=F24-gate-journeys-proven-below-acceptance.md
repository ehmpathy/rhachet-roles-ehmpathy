# F24 — the gate's live journeys are proven at integration and real-api, not at acceptance

## the fork
- A: acceptance cases through `rhx` for the gate refusal, the post-answer ship, and `get --unanswered` → `set` → clear
- B: acceptance holds what needs no pr (`--help`, the unknown-flag refusal); the live journeys stay at integration (p9, pc, gh as a PATH stub) and at the real-api cases run by hand

## taken: B, and why at the time
- every live journey needs an open pr with a comment that waits. an acceptance run can hold one in only two ways:
  - a gh mock — forbidden at acceptance (`rule.forbid.acceptance.mocks`); a mocked acceptance would prove only the stub, as p9 already does
  - a write-scoped token on a home-org pr — the post-answer path posts a comment and flips automerge. the ci test job lacks that scope, which is why `git.pull.comment.real` and `git.release.p9.comment_gate.real` are excluded from ci by name (main's precedent for pc)
- the repo's precedent: `blackbox/git.pull.comment.acceptance.test.ts` (main) also stops at `--help` and input refusals
- what acceptance CAN prove without either was added: the bypass refusal via `rhx` (`--skip-comments` → `✋ ConstraintError: unknown argument`, exit 2, both streams, snapped)
- a read-only run (r011 i003's lever: plan, or `git.pull.comment get --unanswered --in <repo> --pr <n>`, against a merged home-org pr) needs no write scope, but it needs a read token the auth reaches in ci. ci's keyrack firewall exports `EHMPATHY_SEATURTLE_GITHUB_TOKEN` under env `test`; the as-ehmpath auth reads env `prep` (`git.commit/keyrack.operations.sh:64`), and `--auth as-human` needs a gh login the runner lacks. so the read-only lever too waits on an auth or ci-env change, shared with git.commit
- the hand-run real case snaps the live row shape of #1143 (logins masked), so a drift from the p9 fixtures (`line: null`, a url shape) shows in review whenever it runs
- the extant p3 scenes (`on_feat.from_main`, and the rest) are main's own journeys; this change adds one `💬` line to each. an acceptance twin of a read-only scene meets the same token wall as the gate's read
- a chained answer round (release refuses → the printed `set` line runs → release passes) on one stateful stub would need the pc stub (stateful, posts comments) and the git.release stub (key-value, counts calls) merged; the round is proven in two halves today: pc case23 (get → set → get on one stateful stub) and p9 case2/case5 [t1] (the answered state passes)
- dream: `dreams/v2026_10_31.fix.ci-reads-real-pr-comments.md` — split the real suite so its read-only half runs in ci

## rework: dirty
A needs a ci credential with write scope on a sandbox pr, plus a fixture pr that keeps an unanswered comment — a human grant and a cross-repo fixture. the read-only half needs the as-ehmpath auth to reach the env-`test` token in ci, a change to an auth contract git.commit shares.

## confidence: 70%, why low
`rule.require.acceptance-journey-coverage` asks for every journey through the real contract. B leaves the core gate journey one rung below acceptance; the council may judge the credential worth the grant.

## where
`blackbox/git.release.acceptance.test.ts` (header `.note`, case1 [t1]) · r004 blocker.1 (5.3.verification i002, i004) · r011 blocker.1, r010 nitpicks on acceptance (i003) · r003 nitpick.1, r010 nitpick.5 (i004)

## verdict
(awaits council)
