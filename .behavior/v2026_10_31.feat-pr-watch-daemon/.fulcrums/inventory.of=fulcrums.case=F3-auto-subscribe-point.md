# F3 · auto subscribe at pr findsert in `git.commit.push`

- fork: inside `git.commit.push` after the pr findsert · a SessionStart / onBoot hook that scans the clone's open prs · manual `git.pull.watch set` only
- taken: inside `git.commit.push` — that is the moment the wish names ("once a mechanic opens a pr"); `git.commit.push.sh:645-715` already knows the pr number
- rework: clean — the findsert call is one line; it can move to a hook later
- confidence: 85% — a pr opened outside `git.commit.push` (by hand, via gh) is not watched until `set`
- where: `1.vision.yield.md` § the outcome world, § the contract we propose
- risk: low — the subscribe writes a local watch record; it reads no credential and adds no prod write to the push
- verdict: (open; rides vision approval)
