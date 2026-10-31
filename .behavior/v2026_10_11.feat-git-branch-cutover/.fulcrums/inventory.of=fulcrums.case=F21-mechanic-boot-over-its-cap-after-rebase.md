# F21: the mechanic boot exceeds its 30,000-token cap once rebased on main

- **the defect** (PR #1022 run 41210919687, sha cc14be2): main added `budget: 30_000` to the
  mechanic boot and `boot.budget.integration.test.ts` (dc2bfaf). main sits at 29,924. this branch
  adds 837, so the src spec costs 30,761 and shard 5 fails. the linked spec (29,275) passes
- **where the 837 goes**:
  - the cutover header in `say` (~310)
  - the `git.branch.uses` header in `say` (~340)
  - the 7 sub-skill files `<also>` auto-lists (~175), which no `say`/`ref` edit reaches
- **done, in scope** (uncommitted, measured):
  - `git.branch.uses.sh` moves to `ref`, beside `git.commit.uses.sh` under "human-run grants" → 30,419
  - the cutover header condensed to `.what` / `.why` / usage / guarantee → 30,114 (with the row below)
  - `get.package.docs.sh` moves to `ref`; `rule.require.read-package-docs-before-use` already prints
    its command → −179. this one is NOT the cutover's own entry
- **the fork**: still 114 over. what remains is not the cutover's to cut:
  - (a) raise the cap to 31,000, as the boot.yml note asks: a deliberate, reviewed call
  - (b) demote or condense more of main's curated `say` entries (e.g. `git.release.sh`, 480;
    `git.repo.get.sh`, 495) until under 30,000
  - (c) move `git.branch.cutover.sh` to `ref` too (−~280 on top) and keep `get.package.docs` in `say`;
    discovery then rests on the pointers at the point of need (`git.commit.set`'s second-feat
    refusal and `git.branch.rebase help` both name the cutover)
- **lean**: (a) with the in-scope cuts kept. the cutover is the skill the second-feat refusal sends
  a mechanic to; (b) re-curates others' boot under this PR's banner
- **rework**: clean for each — one boot.yml line or one header
- **confidence**: 60% — the cap is a reviewed number, and the wish never weighed a boot cost
- **status**: ruled — director, 2026-10-31, two rounds; built; committed at 91 over
- **verdict**: (c). `git.branch.cutover.sh` moves to `ref`: the `git.commit.set` second-feat refusal
  and `git.branch.rebase help` name it at the moment of need. not (a): the cap is a reviewed bound,
  and a raise buys a pass by relaxing it. not (b): no re-curation of main's lists under this PR, so
  `get.package.docs.sh` stays in `say` as main has it
- **built**: cutover + `git.branch.uses` in `ref` under one "git branch" block; the cutover header
  condensed; the one header line this branch added to `git.stage.add.sh` moved out (its code
  comment already carries the note) → 30,091 / 30,000
- **the error behind the ruling**: the (c) row above claimed it fits. it does not. 30,114 already
  held the `get.package.docs` demotion; with that undone, (c) lands at 30,106, not under 30,000. the
  driver never summed the row
- **what remains (91 over)**, measured per item against main (29,924):
  - `<also>` +137: the 7 sub-skill files the boot lister auto-lists (cutover abort, begin, continue,
    operations, output; uses local, operations). no `say`/`ref` edit reaches them. caught as a dream
    for the boot lister
  - `<skills.ref>` +15: the two `ref` lines. drop them and the files fall back into `<also>`
- **verdict, round 2** (director, 2026-10-31): commit as it stands — cutover + uses in `ref`,
  `get.package.docs` back in `say`, the cuts. the `boot.budget [case3] mechanic` red is named, not
  this PR's to clear: its cause is the boot lister's auto-list of the 7 sub-skill files (+137), and
  its cure is upstream (`dreams/v2026_10_31.reseed.boot-lister-auto-lists-sub-skills.md`). the
  director owns that cure and drives it; this PR rebases onto it when it ships
