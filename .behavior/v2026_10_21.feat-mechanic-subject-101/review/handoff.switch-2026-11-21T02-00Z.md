# handoff: #1065 at the switch, 2026-11-21 02:00Z

## state (2026-11-20)
- all work is in the tree, uncommitted, verified locally (build, types, lint, format, boot integration + both 101 acceptance suites)
- commits blocked globally (`git.commit.uses`: left 1, global blocked); a human lifts with `rhx git.commit.uses allow --global`
- threads 4643334177 and 4643342087 answered (r4644104632, r4644107118); 4643366446 open
- rulings: F23 (mechanic budget 30,500) stands, the pr body must name it beside the 30,185 read; F24, F25 stand

## steps at the switch
1. pr body: name the 30,500 raise beside the 30,185 full-role read (`rhx git.pull.description set`; draft in `pr.body.draft.md`)
2. commit + push: `rhx git.commit.set -m @stdin --mode apply --unstaged include --push`, header `cont(boot): each 101 carries the heart of its role, for mechanic, architect, and ergonomist`
3. `rhx git.release --watch` (no apply, no automerge); on red, `rhx show.gh.test.errors`
4. the reply is already posted (r4647560782, key `heart-and-three-101s`); swap its "pushes then" lines for the sha and the ci verdict in `reply.4643366446.md`, then upsert it via
   `rhx git.pull.comment.set --which 1065 --reply-to 4643366446 --key heart-and-three-101s --from .behavior/v2026_10_21.feat-mechanic-subject-101/review/reply.4643366446.md --mode apply`
5. read unanswered (no `rhx git.pull.get` exists): `gh api --method GET repos/ehmpathy/rhachet-roles-ehmpathy/pulls/1065/comments --paginate --jq` with the filter: top-level, not by the bot, no reply → must read 0 by 02:30Z
