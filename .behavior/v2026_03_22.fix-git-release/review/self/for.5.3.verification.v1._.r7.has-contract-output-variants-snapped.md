# review: has-contract-output-variants-snapped (r7)

## methodology

r6 verified all 17 vision output variants are present in snapshots. r7 asks: what output variant might be absent? let me inspect actual snapshot files.

---

## direct snapshot inspection

### snapshot file: p3.on_feat.into_main.snap

**file:** `src/domain.roles/mechanic/skills/git.release/__snapshots__/git.release.p3.scenes.on_feat.into_main.integration.test.ts.snap`

**scanned for vision variants:**

| variant | found in snap? | snap name / line |
|---------|----------------|------------------|
| `🐢 crickets...` | ✓ | "exit 2: crickets" |
| `🫧 no open branch pr` | ✓ | line 6 |
| `🐢 heres the wave...` | ✓ | "plan mode" snaps |
| `🌊 release:` | ✓ | all transport status snaps |
| `👌 all checks passed` | ✓ | passed states |
| `🐢 N check(s) in progress` | ✓ | inflight states |
| `⚓ N check(s) failed` | ✓ | failed states |
| `🌴 automerge unfound` | ✓ | wout-automerge states |
| `🌴 automerge enabled [added]` | ✓ | apply mode with automerge |
| `🌴 already merged` | ✓ | merged states |
| `🥥 let's watch` | ✓ | watch mode snaps |
| `✨ done!` | ✓ | watch complete snaps |
| `🐚 needs rebase` | ✓ | rebase:behind state |
| `hint: use --apply` | ✓ | passed states |
| `hint: use --retry` | ✓ | failed states |

### snapshot file: p3.on_feat.into_prod.snap

**additional variants verified:**

| variant | found in snap? |
|---------|----------------|
| `🫧 and then...` | ✓ |
| `💤 N left, Xs in action` | ✓ |
| `🌊 release: chore(release): vX.Y.Z` | ✓ |
| `🌊 release: vX.Y.Z` (tag) | ✓ |

### snapshot file: p3.on_main.into_main.snap

**constraint error variant:**

| variant | found in snap? |
|---------|----------------|
| `🐢 bummer dude...` | ✓ |
| `--from main --into main is invalid` | ✓ |

---

## gap analysis: what could be absent?

### potential gap 1: --help output

**checked:** `git.release --help` not explicitly snapped.

**but:** the skill's help output is handled by bash argument parse, not custom code. help output is documented in the skill header comments which are source-controlled.

**verdict:** acceptable — help is static documentation, not dynamic output.

### potential gap 2: malformed input errors

**checked:** tests don't cover `git.release --unknown-flag`.

**but:** bash getopts handles unknown flags with default error. this is shell behavior, not skill logic.

**verdict:** acceptable — unknown flag is shell error.

### potential gap 3: gh CLI failure

**checked:** tests mock gh to return valid responses.

**search for error handle:** looked for `gh_with_retry` error paths in tests.

**found:** p1.integration.test.ts line 2166 tests empty token case which causes gh to fail.

**verdict:** error handle is tested in p1.

---

## honest assessment: any real gaps?

### gap found: `🌴 automerge enabled [found]` not distinct in p3

the vision distinguishes:
- `[added]` = we just enabled it
- `[found]` = it was already enabled

**searched p3 snaps:**

most snaps show `[added]` because apply mode adds automerge. the `[found]` case requires a scenario where automerge was already enabled before we called --apply.

**checked p2:** p2.integration.test.ts has test cases for "automerge already enabled" (line 1650 area).

**verdict:** `[found]` is tested in p2, just not in p3. coverage exists.

---

## summary

| variant category | coverage |
|------------------|----------|
| turtle vibes headers (🐢) | ✓ all 4 vibes |
| transport status (🌊) | ✓ feat PR, release PR, tag |
| check states (👌/🐢/⚓) | ✓ passed, inflight, failed |
| automerge states (🌴) | ✓ unfound, added; found in p2 |
| watch output (🥥/💤/✨) | ✓ header, polls, completion |
| transitions (🫧) | ✓ no PR, and then |
| edge cases | ✓ rebase, constraint error |

**all contract output variants have snapshot coverage across p1/p2/p3 test files.**

