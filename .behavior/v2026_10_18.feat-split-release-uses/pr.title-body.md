# pr #1021: title + body

set the title from the `## title` line via `rhx git.pull.title set`, and the body from all below `## body` via `rhx git.pull.description set`.

---

## title

feat(git.release): split git.release.uses from git.commit.uses, plus eight ci fixes

## body

## .what

a release gets its own meter. two meters, two gates, two owners:

| meter | governs | granted by |
|---|---|---|
| `git.commit.uses` | commits, stage, rebase, and pushes to this tree's own branch (incl. a rebase's force push) | a director, freely |
| `git.release.uses` | a release: `git.release --mode apply` (merge to main, tag, publish) | the human's release stamp |

a commit grant never ships. a release grant needs no commit quota.

## .why

`git.commit.uses --push allow|block` was one bit for two acts with opposite stakes: a branch push (cheap, reversible) and a ship. so every branch push and every rebase waited on the same human a release does. measured 2026-10-18: a rebase of a branch with zero commits took two grants and two round trips.

## .the split

- `git.release.uses` (new): `set --quant N` · `allow` · `block` · `del` · `get`, at local, `--org`, `--global`. levels compose by AND; unset at any level blocks. every write needs a human at a tty
- `git.release --mode apply` spends one use at the gate, refunds it if the arm fails, and refuses unpushed commits
- `git.commit.uses`: `push: held` is a grant on the commit meter; a push spends no use; `git.branch.rebase` and `git.stage.add` read the commit meter only
- the file tools (`sedreplace`, `symlink`, `cpsafe`, `mvsafe`, `teesafe`) refuse any write into `.meter/`, so a robot cannot forge a grant or a stamp (5.3 r4 i001 blocker.3, conceded urgent)
- briefs + boot: `howto.git-release`, `rule.require.git-release-confidence`, `rule.require.watch-release-after-push`, `howto.git-commit-set` name the two meters

## .riders

this pr also carries what its suites need to run green:

- **deps:** rhachet-roles-bhrain 0.42.1, rhachet 1.50.0, bhuild 0.23.2, rhachet-roles-ehmpathy 1.41.0 (the git.pull title and description verbs), plus a pnpm patch on bhrain (`patches/rhachet-roles-bhrain@0.42.1.patch`): a glob confined to a route keeps its matches; the promised emit points at `--as passed`. clamped in `src/infra/patches/`; the graded half goes upstream (bhrain#643, #645)
- **rhachet 1.49 split settings layout:** the repo brain dir moves to `.agent/.actors/actor.via.repo=ambient/`; hook and acceptance suites read the split layout; acceptance fixtures pin the old one (`setFixtureLayoutOld`)
- **rhachet 1.50 introspect:** the self-boot hooks drop (introspect refuses a role whose onBoot runs `rhachet roles boot`; boot.md already renders it)
- **ci fixes:**
  - `brief.compress` retries a degenerate sitrep (`isSitrepDegenerate`, `getOneSitrepViaAsks`, now in `src/domain.operations/sitrep/`)
  - `init.claude.permissionrequest.sh` seats the PermissionRequest decider in this repo's own settings (no role can declare that hook yet: rhachet ask held for `onPermission`)
  - `set.package`: an install or upgrade failure names the package manager's last line; the real-pnpm case runs the pinned pnpm via corepack, since ci test jobs install no pnpm
  - `git.repo.get`: gh's github-actions no-credential text reads as "not logged in", never "repo not found"
  - `git.commit.push` [case41]: pins `main` at the base commit, for a runner whose default branch differs
  - `git.release` p2 snapshots mask jq's per-version parse text
  - `set.package.install` security-block snapshot masks the live npm advisory list (the feed merged and reworded lodash advisories with no code change); explicit assertions still pin the audit failure
  - `.husky/check.timestamps.sh` + its clamp
- **boot:** the mechanic boot is trimmed back under its 30,000-token cap after the #1180 rebase (29,837): `git.release.uses`, `get.package.docs`, `git.pull.comment.del` move say → ref (F43)

## .how to review fast

274 files. most are not code:

| kind | files | read |
|---|---|---|
| route record: `.behavior/v2026_10_18.feat-split-release-uses/**`, `.dream/**` | 119 | skim; the decisions live in `.fulcrums/` (F1–F43) and `5.3.verification.yield.md` |
| generated: `__snapshots__/**` (35), `pnpm-lock.yaml`, two derived settings json | 38 | spot-check the snapshots: they show each render |
| authored | ~117 | read |

of the authored ~117, read the split first (~79):

1. `src/domain.roles/mechanic/skills/git.release/git.release.uses*.sh`, `git.release._.guard_release_meter.sh`, `git.release.sh`
2. `src/domain.roles/mechanic/skills/git.commit/git.commit.uses*.sh`, `git.commit.operations.sh`, `git.commit.push.sh`
3. `src/domain.roles/mechanic/skills/claude.tools/*.sh` (the `.meter/` guard) + `refuse-human-grant.integration.test.ts`
4. `blackbox/git.release.uses.acceptance.test.ts` and its snapshot: the journey a human sees

then the riders (~40, mostly mechanical): `patches/`, `src/infra/patches/`, `src/.test/`, `blackbox/.test/`, `src/domain.operations/sitrep/`, `set.package/`, `git.repo.get/`.

## .tests

full `--thorough` suite on `6f5ebe1`: unit 204 passed; integration 4,616 passed (8 local fails, each named in the route: boot cap fixed, 7 load or host-only); acceptance 275 passed. ci on the rebase onto v1.41.0 (`67d97d0`): 25 passed, 1 skipped (`github / apply`).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
