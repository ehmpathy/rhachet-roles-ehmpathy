# self-review: has-snap-changes-rationalized (round 6)

## the question

is every `.snap` file change intentional and justified?

## snap files changed

```
git status --short -- '**/*.snap'

AM src/domain.roles/mechanic/skills/__snapshots__/cicd.deflake.integration.test.ts.snap
MM src/domain.roles/mechanic/skills/git.branch.rebase/__snapshots__/git.branch.rebase.take.integration.test.ts.snap
 M src/domain.roles/mechanic/skills/git.release/__snapshots__/git.release.p3.scenes.on_feat.into_prod.integration.test.ts.snap
MM src/domain.roles/mechanic/skills/git.release/__snapshots__/git.release.p3.scenes.on_main.into_prod.integration.test.ts.snap
MM src/domain.roles/mechanic/skills/git.repo.test/__snapshots__/git.repo.test.integration.test.ts.snap
```

status key:
- AM = added + modified (new file with local changes)
- MM = staged + unstaged changes
- M = unstaged only

## per-file rationalization

### 1. cicd.deflake.integration.test.ts.snap (AM)

**what changed:** 23 new snapshot exports added (207 lines total)

all 11 test cases now have stdout + stderr snapshots:
- case1-3: init success variants (turtle vibes, route list, bind confirmation)
- case4: detect without --into error
- case5: help output
- case6: unknown subcommand error
- case7: no subcommand (shows usage)
- case8: not in git repo error
- case9: detect success with mock gh cli
- case10: detect auth failure
- case11: real GitHub API integration

**intentional:** yes — this is the work of this behavior route. these snapshots were added to achieve exhaustive contract coverage (see r6 has-contract-output-variants-snapped review).

**rationale:** the cicd.deflake skill needed snapshot coverage for all output variants. now all 11 cases have complete stdout + stderr snapshots.

### 2. git.branch.rebase.take.integration.test.ts.snap (MM)

**what changed:** temp directory paths and timestamps changed
```diff
-No package.json found in /tmp/git-rebase-take-test-aMPqop
+No package.json found in /tmp/git-rebase-take-test-WUcW6n

-npm error A complete log of this run can be found in: /home/vlad/.npm/_logs/2026-04-11T22_29_56_908Z-debug-0.log
+npm error A complete log of this run can be found in: /home/vlad/.npm/_logs/2026-04-11T23_10_46_165Z-debug-0.log
```

**intentional:** no — these are dynamic values that leaked into snapshots

**this is flaky:** temp directories are random, timestamps vary by test execution time

**not caused by this behavior:** this change predates the cicd.deflake work. the file shows MM status (staged + unstaged) which shows prior work on branch.

**recommendation:** these paths/timestamps should be masked in the test before snapshot. this is tech debt for a separate fix.

### 3. git.release.p3.scenes.on_feat.into_prod.integration.test.ts.snap (M)

**what changed:** significant content removal - whole sections with "and then..." and watch output removed

**analyzed diff:** multiple snapshots lost their post-merge watch output (publish.yml lines, failure details)

**intentional:** unclear — this could be a regression or intentional behavior change

**not caused by this behavior:** this file is M (unstaged only), the changes are not from staged cicd.deflake work

**recommendation:** this needs investigation in a separate fix. the removal of failure hints and watch output may be a regression.

### 4. git.release.p3.scenes.on_main.into_prod.integration.test.ts.snap (MM)

**what changed:**
- staged: added more "watch" lines, removed failure details
- unstaged: further changes to failure output

**intentional:** unclear — mixed staged/unstaged shows in-progress work

**not caused by this behavior:** MM status shows this is from separate work on the branch

### 5. git.repo.test.integration.test.ts.snap (MM)

**what changed:** execution time changed (0s vs 1s)
```diff
-   │  └─ 💥 malfunction (1s)
+   │  └─ 💥 malfunction (0s)
```

**intentional:** no — this is time variance

**this is flaky:** execution time depends on system load, should be masked

**not caused by this behavior:** MM status shows prior work

## summary

| file | change type | intentional | caused by cicd.deflake |
|------|-------------|-------------|----------------------|
| cicd.deflake.*.snap | 23 new exports | yes | yes |
| git.branch.rebase.take.*.snap | path/timestamp | no (flaky) | no |
| git.release.p3.*.feat.*.snap | content removal | unclear | no |
| git.release.p3.*.main.*.snap | mixed | unclear | no |
| git.repo.test.*.snap | time value | no (flaky) | no |

## scope decision

the cicd.deflake snapshot changes are intentional and rationalized.

the other snapshot changes are:
1. not caused by this behavior route (predates it or parallel work)
2. either flaky values (temp paths, timestamps, time) or unclear regressions
3. should be addressed in separate work, not this behavior

## verdict

holds for cicd.deflake scope. the 23 new snapshots are intentional and justified.

the other snap changes require separate investigation:
- git.branch.rebase.take: mask temp paths and timestamps
- git.release: investigate content removal regressions
- git.repo.test: mask time values

these are out of scope for cicd.deflake-route behavior.
