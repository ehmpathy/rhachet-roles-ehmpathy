# F12 — which grant lets a crew stage

- **fork** — (a) `git.stage.add` reads the commit meter only for paths a rebase left unmerged; a mixed call refuses whole · (b) while a rebase is in progress, `git.stage.add` reads the commit meter for any path; out of a rebase, the `--stage` field gates · (c) a fourth meter, `git.rebase.uses`, that also unlocks stage · (d) retire the stage field: `git.stage.add` reads the commit meter, always
- **taken** — (d), ruled by the human. "if you can commit, you can stage. if you can rebase, you can stage. otherwise, no stage." a rebase spends no use and needs the commit grant to begin, so "may rebase" never outlives "may commit": one read of the commit meter covers both. a live grant = global ∧ org ∧ local quota > 0. stage spends no use
- **rejected** — (a): a per-path test with a mixed-path refusal, more surface for no gain. (b): two rules where one serves; out of a rebase it still owes a second grant before a commit grant is usable. (c): the canonical wish puts rebase under commit, and a fourth grant restores the round trip the wish exists to remove
- **the use given up** — a stage-only grant (`stage allow`, quota 0), where a robot prepares a staged set for a human to commit. the human, verbatim: "yeah we never work like that. we always work with everyhting on a tree gets released"
- **why it is safe** — a staged file is local index state: it leaves the machine only via a commit and a push, and each of those still reads its own meter. `git restore --staged` undoes it
- **migration** — the `stage` field is never read; `git.commit.uses set --stage …` refuses the retired flag loudly, as the old `--push` (F8); the migration note names it (inventory 3.13)
- **rework** — clean
- **confidence** — 95% (ruled)
- **where** — `1.vision.yield.md` contract, act table, before/after, cons, Q10 · inventory 3.9–3.13 · `case=1` (3.11) · `case=10` (3.9, 3.10) · dimensions P3
- **verdict** — ruled (d): stage rides the commit grant, in a rebase or out; the `--stage` field retires (human, 2026-10-19). supersedes the earlier decision of (b)
