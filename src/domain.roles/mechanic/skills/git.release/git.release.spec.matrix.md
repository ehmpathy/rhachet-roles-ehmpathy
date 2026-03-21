# git.release.spec

## overview

`git.release` manages the release cycle for feature branches and production releases.

---

## model

### branch contexts

| from | to | entities in path |
|------|-----|------------------|
| feat | main | feature PR |
| main | prod | release PR → tag workflows |
| feat | prod | feature PR → release PR → tag workflows |

### entity states

| state | description |
|-------|-------------|
| `unfound` | entity does not exist |
| `inflight` | checks in progress |
| `passed:wout-automerge` | checks passed, not merged, no automerge |
| `passed:with-automerge` | checks passed, not merged, automerge set |
| `merged` | already merged |
| `failed` | checks failed |
| `rebase:behind` | needs rebase (BEHIND) |
| `rebase:dirty` | needs rebase with conflicts (DIRTY) |

### modes

| mode | behavior |
|------|----------|
| `plan` | show status, no mutations, stop at first entity |
| `apply` | enable automerge, watch until complete, continue through path |
| `--watch` | poll until complete (no automerge unless apply) |
| `--retry` | rerun failed workflows, then optionally watch |
| `--from main` | skip feature branch requirement, act as if on main |

### flag combinations

| flags | valid | behavior |
|-------|-------|----------|
| (none) | yes | plan mode, --to main (or --to prod when on main) |
| `--to main` | yes | plan mode, release to main |
| `--to prod` | yes | plan mode, release to prod |
| `--mode apply` | yes | apply mode |
| `--watch` | yes | watch mode (no automerge) |
| `--mode apply --watch` | yes | same as `--mode apply` (watch implied) |
| `--retry` | yes | rerun failed, plan mode |
| `--retry --watch` | yes | rerun failed, watch until complete |
| `--retry --mode apply` | yes | rerun failed, apply mode |
| `--from main --to prod` | yes | skip feature branch, release main to prod |
| `--from main --to main` | no | exit 2: invalid, already on main |
| `--dirty allow` | yes | skip dirty check (only with apply) |
| `--dirty allow --mode plan` | yes | ignored (dirty check only on apply) |

---

## --watch flag behavior

`--watch` polls CI until complete without automerge.

| PR state | automerge | --watch behavior | exit |
|----------|-----------|------------------|------|
| checks inflight | unfound | poll until complete | per result |
| checks inflight | found | poll, await merge | per result |
| checks passed | unfound | exit immediately | 0 |
| checks passed | found | poll, await merge | per result |
| checks failed | any | exit immediately | 2 |
| merged | any | exit immediately | 0 |

**vs --mode apply:**
- `--watch` only watches, never enables automerge
- `--mode apply` enables automerge (if not set), then watches

---

## watch loop internals

### poll progress display

watch loop shows:
- `💤` sleep line between polls
- `Ns in action` — time since check started
- `Ns watched` — time since watch began
- progress: `N check(s) in progress`

### mid-watch state changes

| detected state | behavior | exit |
|----------------|----------|------|
| BEHIND (rebase needed) | failloud with rebase hint | 2 |
| DIRTY (conflicts) | failloud with conflicts hint | 2 |
| checks failed | show failures, exit | 2 |
| merged | show success, exit | 0 |

### mixed check states

when some checks fail and others are still in progress:

| failed checks | inflight checks | behavior | exit |
|---------------|-----------------|----------|------|
| 1+ | 0 | show failures only | 2 |
| 1+ | 1+ | show both failures and progress | 2 |
| 0 | 1+ | show progress only | per mode |
| 0 | 0 (all pass) | show success | 0 |

**rationale:** failed checks are shown immediately (exit 2) even if other checks are still inflight.
user may want to fix failures while other checks complete.

### test mode

`GIT_RELEASE_TEST_MODE=true` limits poll iterations to prevent infinite loops in tests.
exits 1 on iteration limit (timeout).

---

## automerge edge cases

| scenario | behavior |
|----------|----------|
| automerge already set | skip enable, show `[found]` |
| enable returns "clean status" | PR ready to merge immediately, poll for MERGED |
| enable fails with actual error | failloud, exit 1 (malfunction) |

---

## merged PR fallback

when feature branch PR lookup finds no open PR:
1. search merged PRs for branch
2. if merged PR found, show its status (state: MERGED)

---

## tag workflow detection

detects these workflow files for tag workflows:
- `publish.yml`
- `deploy.yml`

---

## state matrices

### to main, from feat

Single entity: **feature PR**

| feat PR | plan | apply | --watch |
|---------|------|-------|---------|
| unfound | exit 2: hint push | exit 2: hint push | exit 2: hint push |
| inflight | exit 0: show progress | watch → exit per result | poll → exit per result |
| passed:wout-automerge | exit 0: hint apply | add automerge, watch → exit 0 | exit 0: automerge unfound |
| passed:with-automerge | exit 0: show automerge | watch → exit 0 | poll, await merge → exit 0 |
| merged | exit 0: show merged | exit 0: show merged | exit 0: show merged |
| failed | exit 2: show failures | exit 2: show failures | exit 2: show failures |
| rebase:behind | exit 2: hint rebase | exit 2: hint rebase | exit 2: hint rebase |
| rebase:dirty | exit 2: hint rebase+conflicts | exit 2: hint rebase+conflicts | exit 2: hint rebase+conflicts |

**--watch vs apply:** `--watch` only polls without enable automerge; `apply` enables automerge then polls.

---

### to prod, from main

Two entities: **release PR** → **tag workflows**

In plan mode, we only show release PR status. Tag workflows not reached.

| release PR | tag workflows | plan | apply | --watch |
|------------|---------------|------|-------|---------|
| unfound | unfound | exit 0: show latest tag | exit 0: show latest tag, no workflows | exit 0: show latest tag |
| unfound | inflight | exit 0: show latest tag | watch tags → exit per result | poll tags → exit per result |
| unfound | passed | exit 0: show latest tag | exit 0: tags passed | exit 0: tags passed |
| unfound | failed | exit 0: show latest tag | exit 2: tag failure, hint retry | exit 2: tag failure |
| inflight | — | exit 0: show progress | watch PR → continue to tags | poll PR → exit per result |
| passed:wout-automerge | — | exit 0: hint apply | add automerge, watch → continue to tags | exit 0: automerge unfound |
| passed:with-automerge | — | exit 0: show automerge | watch → continue to tags | poll, await merge → continue |
| merged | unfound | exit 0: show merged | exit 0: no tag workflows | exit 0: no tag workflows |
| merged | inflight | exit 0: show merged | watch tags → exit per result | poll tags → exit per result |
| merged | passed | exit 0: show merged | exit 0: tags passed | exit 0: tags passed |
| merged | failed | exit 0: show merged | exit 2: tag failure, hint retry | exit 2: tag failure |
| failed | — | exit 2: show failures | exit 2: show failures | exit 2: show failures |

**Legend:** `—` = tag workflows not yet relevant (PR not merged)

---

### to prod, from feat

Three entities: **feature PR** → **release PR** → **tag workflows**

In plan mode, we stop at first incomplete entity.

| feat PR | release PR | tag workflows | plan | apply | --watch |
|---------|------------|---------------|------|-------|---------|
| unfound | — | — | exit 2: hint push | exit 2: hint push | exit 2: hint push |
| inflight | — | — | exit 0: show feat progress | watch feat → continue | poll feat → continue |
| passed:wout-automerge | — | — | exit 0: show feat, hint apply | add automerge, watch feat → continue | exit 0: automerge unfound |
| passed:with-automerge | — | — | exit 0: show feat automerge | watch feat → continue | poll, await merge → continue |
| failed | — | — | exit 2: show feat failures | exit 2: show feat failures | exit 2: show failures |
| rebase:behind | — | — | exit 2: hint rebase | exit 2: hint rebase | exit 2: hint rebase |
| rebase:dirty | — | — | exit 2: hint rebase+conflicts | exit 2: hint rebase+conflicts | exit 2: hint rebase+conflicts |
| merged | unfound | — | exit 0: show latest tag | exit 0: no release PR or tags | exit 0: show latest tag |
| merged | inflight | — | exit 0: show release progress | watch release → continue to tags | poll release → continue |
| merged | passed:wout-automerge | — | exit 0: show release, hint apply | add automerge, watch → continue | exit 0: automerge unfound |
| merged | passed:with-automerge | — | exit 0: show release automerge | watch → continue to tags | poll, await merge → continue |
| merged | merged | unfound | exit 0: show both merged | exit 0: no tag workflows | exit 0: no tag workflows |
| merged | merged | inflight | exit 0: show both merged | watch tags → exit per result | poll tags → exit per result |
| merged | merged | passed | exit 0: show both merged | exit 0: tags passed | exit 0: tags passed |
| merged | merged | failed | exit 0: show both merged | exit 2: tag failure, hint retry | exit 2: tag failure |
| merged | failed | — | exit 2: show release failures | exit 2: show release failures | exit 2: show failures |

**Legend:** `—` = entity not yet relevant (prior entity not merged)

---

## invalid state combinations

These states are unreachable or nonsensical:

| combination | why invalid |
|-------------|-------------|
| plan + any entity after first incomplete | plan mode stops at first entity |
| from main + feature PR states | no feature PR when on main |
| release PR unmerged + tag workflows not unfound | tags only run after release merges |
| feat PR unmerged + release PR not — | release PR created after feat merges |
| apply + rebase:behind/rebase:dirty | apply exits 2 on rebase states, no watch |
| `--from main --to main` | invalid: already on main, can't release to main |

---

## retry behavior

`--retry` reruns failed workflows. only applies when checks are in `failed` state.

### --retry state matrix

| entity | state | --retry | --retry --watch | --retry --mode apply |
|--------|-------|---------|-----------------|----------------------|
| feature PR | failed | rerun, exit 0, hint --watch | rerun, poll → exit per result | rerun, add automerge, watch → exit per result |
| feature PR | not failed | no-op, show status | no-op, poll if inflight | no-op, add automerge if needed, watch |
| release PR | failed | rerun, exit 0, hint --watch | rerun, poll → exit per result | rerun, add automerge, watch → exit per result |
| release PR | not failed | no-op, show status | no-op, poll if inflight | no-op, add automerge if needed, watch |
| tag workflows | failed | rerun, exit 0, hint --watch | rerun, poll → exit per result | rerun, watch → exit per result |
| tag workflows | not failed | no-op, show status | no-op, poll if inflight | no-op, watch if inflight |

### --retry + mode combinations

| flags | behavior |
|-------|----------|
| `--retry` (plan default) | rerun failed workflows, show status, exit 0 |
| `--retry --watch` | rerun failed workflows, poll until complete, exit per result |
| `--retry --mode apply` | rerun failed workflows, add automerge, watch until complete |
| `--retry --mode apply --watch` | same as `--retry --mode apply` (--watch implied by apply) |

**exit codes for --retry:**
- exit 0: rerun triggered (or no failed workflows) in plan mode
- exit 0: after watch, checks pass
- exit 2: after watch, checks still fail

---

## dirty state detection

| worktree | mode | behavior |
|----------|------|----------|
| dirty | plan | ignore (dirty check only on apply) |
| dirty | --watch | ignore (dirty check only on apply) |
| dirty | apply (default) | exit 2: hint stash or --dirty allow |
| dirty | apply --dirty allow | proceed normally |
| clean | apply | proceed normally |
| clean | --watch | proceed normally |

**note:** dirty check applies only to `--mode apply`. plan and `--watch` modes are read-only and ignore dirty state.

---

## --from main behavior

`--from main` skips the feature branch requirement. useful when:
- on a feature branch but want to watch/apply the main → prod release
- on main and want to release to prod
- to check release status from any branch

### branch detection

| flag | current branch | --to | behavior |
|------|----------------|------|----------|
| (none) | feat | (defaults to main) | feat → main flow |
| (none) | main | (defaults to prod) | main → prod flow |
| `--to main` | feat | main | feat → main flow |
| `--to main` | main | main | exit 2: already on main |
| `--to prod` | feat | prod | feat → main → prod flow |
| `--to prod` | main | prod | main → prod flow |
| `--from main` | any | main | exit 2: already on main |
| `--from main` | any | prod | main → prod flow |

**note:** default `--to` target depends on current branch:
- on feature branch: defaults to `--to main`
- on main branch: defaults to `--to prod`

### --from main state matrix

when `--from main --to prod` is used, feature PR is ignored regardless of its state:

| current branch | feat PR state | release PR | plan | apply | --watch |
|----------------|---------------|------------|------|-------|---------|
| feat | any | unfound | exit 0: show latest tag | exit 0: no release PR | exit 0: show latest tag |
| feat | any | inflight | exit 0: show progress | watch → continue to tags | poll → continue to tags |
| feat | any | passed:wout-automerge | exit 0: hint apply | add automerge, watch → continue | exit 0: automerge unfound |
| feat | any | passed:with-automerge | exit 0: show automerge | watch → continue to tags | poll, await merge → continue |
| feat | any | merged | exit 0: show merged | continue to tags | exit 0: continue to tags |
| feat | any | failed | exit 2: show failures | exit 2: show failures | exit 2: show failures |
| main | — | (same as above) | (same) | (same) | (same) |

**key point:** `--from main` always ignores the feature PR, even when on a feature branch.

examples:
```bash
# on feature branch, watch main release
rhx git.release --from main --to prod --watch

# on feature branch, apply main release
rhx git.release --from main --to prod --mode apply

# on any branch, check prod release status
rhx git.release --from main --to prod
```

---

## permission requirements

apply mode requires git.commit.uses permission (locally or globally).

| permission state | plan | --watch | apply |
|------------------|------|---------|-------|
| allowed | proceed | proceed | proceed |
| blocked (local) | proceed | proceed | exit 2: hint permission |
| blocked (global) | proceed | proceed | exit 2: hint permission |
| quota exhausted | proceed | proceed | exit 2: hint permission |

**note:** plan and `--watch` modes never check permissions — they are read-only. only `--mode apply` requires permission because it enables automerge (a mutation).

---

## argument validation

### input validation (exit 2 = constraint)

| condition | exit | message |
|-----------|------|---------|
| `--to` invalid value | exit 2 | `--to must be 'main' or 'prod'` |
| `--mode` invalid value | exit 2 | `--mode must be 'plan' or 'apply'` |
| `--dirty` invalid value | exit 2 | `--dirty must be 'block' or 'allow'` |
| `--from` invalid value | exit 2 | `--from must be 'main'` |
| `--from main --to main` | exit 2 | already on main, can't release to main |
| not in git repo | exit 2 | not in a git repository |
| apply without git.commit.uses | exit 2 | hint permission |
| dirty worktree + apply | exit 2 | hint stash or --dirty allow |

### runtime errors (exit 1 = malfunction)

| condition | exit | message |
|-----------|------|---------|
| multiple release PRs (ambiguous) | exit 1 | multiple release PRs found, expected at most one |
| keyrack locked | exit 1 | hint unlock |
| gh command fails | exit 1 | (gh error message) |

### defaults and help

| condition | exit | behavior |
|-----------|------|----------|
| no arguments | exit 0 | default --to main, show status |
| `--help` | exit 0 | show usage |
| `-h` | exit 0 | show usage |

---

## exit codes

| code | semantics | examples |
|------|-----------|----------|
| 0 | success | checks pass, merged, retry triggered |
| 1 | malfunction | gh error, ambiguous state, test mode timeout |
| 2 | constraint | checks fail, needs rebase, no PR, invalid args, dirty |

---

## output elements

### header line

shows command invocation:
- `🐚 git.release --to main` (plan)
- `🐚 git.release --to main --mode apply` (apply)
- `🐚 git.release --to main --watch` (watch)

### status tree

shows entity states with turtle vibes tree structure:
- `├─ pr` with state indicator
- `├─ checks` with pass/fail/progress counts
- `├─ automerge` with enabled/unfound status
- `└─ state` with OPEN/MERGED/etc

### automerge indicators

| scenario | output |
|----------|--------|
| automerge not set | `automerge unfound` |
| automerge already set | `automerge enabled [found]` |
| automerge just enabled | `automerge enabled [added]` |

### watch progress

watch loop output:
- `💤 Ns watched` — poll separator with elapsed time
- `Ns in action` — time since check started
- `N check(s) in progress` — progress indicator

### completion messages

| outcome | message |
|---------|---------|
| checks passed | `✨ done! all checks passed` |
| merged | `✨ done! pr merged` |
| failed | shows failure tree with check names and links |
| needs rebase | `⚓ needs rebase` with hint |
| needs rebase (conflicts) | `⚓ needs rebase` with conflicts hint |

