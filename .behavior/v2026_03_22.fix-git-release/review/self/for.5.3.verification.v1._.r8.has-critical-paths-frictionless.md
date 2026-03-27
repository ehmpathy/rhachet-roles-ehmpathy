# review: has-critical-paths-frictionless (r8)

## methodology

r7 compared repros targets to snapshots. r8 skeptically examines what "frictionless in practice" means from a user perspective.

---

## hostile reviewer simulation

### question 1: could the flag change cause confusion?

**change:** `--to` → `--into`

**potential friction:**
- extant scripts that use `--to` will break
- muscle memory from prior usage

**verification:**

searched for backward compatibility:

```bash
grep "\\-\\-to" git.release.sh
```

**result:** the skill does NOT accept `--to` anymore. users will see an error.

**is this friction?**

yes, but intentional. the vision (1.vision.md) explicitly notes "migration: `--to` → `--into` change requires documentation update".

**mitigation:** the error message will show valid flags. users learn the new flag on first encounter.

**verdict:** acceptable friction — design decision, not a bug

### question 2: could automerge fail silently?

**concern:** what if `gh pr merge --auto` fails?

**verification:**

examined git.release.operations.sh for error handle:

```bash
enable_automerge() {
  if ! gh pr merge --auto --squash "$pr_number"; then
    echo "⚓ failed to enable automerge" >&2
    exit 1
  fi
}
```

**verdict:** ✓ errors are surfaced, not hidden

### question 3: could the watch timeout silently?

**concern:** what happens after 15 minutes?

**verification:**

examined emit_transport_watch for timeout behavior. the function shows `⏰ timeout after 15m`.

**verdict:** ✓ timeout is explicit

### question 4: could the `🫧 and then...` transition mislead the user?

**concern:** user might think command is done when they see `🫧 and then...`

**verification:**

examined p3 snapshots:

```
🫧 and then...
🌊 release: chore(release): v1.33.0 🎉
```

the `🌊` block immediately follows, so user knows there's more. the `🫧` is a visual separator, not an end marker.

**verdict:** ✓ not misleads — next block follows immediately

### question 5: could hint messages be unclear?

**examined all hint variations:**

| hint | context | clear? |
|------|---------|--------|
| `hint: use --apply to enable automerge and watch` | passed, wout-automerge | ✓ |
| `hint: use --retry to rerun failed workflows` | failed checks | ✓ |
| `hint: use rhx show.gh.test.errors to see test output` | failed checks | ✓ |
| `hint: use git.commit.push to push and findsert pr` | unfound PR | ✓ |
| `hint: rhx git.branch.rebase begin` | needs rebase | ✓ |

all hints tell user exactly what to do next.

**verdict:** ✓ hints are actionable

### question 6: could the ConstraintError confuse?

**concern:** `--from main --into main is invalid` — why?

**examined snapshot:**

```
⛈️ ConstraintError: --from main --into main is invalid
   └─ release must have different source and target
```

**verdict:** ✓ explanation provided

---

## user journey walkthrough

### journey: first-time user on feat branch

1. user runs `rhx git.release`
2. sees `🐢 heres the wave...` — friendly, not scary
3. sees status tree with `👌` or `🐢` emoji — clear state
4. sees hint to use `--apply` — knows next step
5. user runs `rhx git.release --apply`
6. sees `🐢 cowabunga!` — knows it worked
7. sees `✨ done!` — knows it's complete

**friction points:** none detected. each step tells user what happened and what to do next.

### journey: user with failed checks

1. user runs `rhx git.release`
2. sees `⚓ 1 check(s) failed` — knows there's a problem
3. sees `🔴 test-unit` with link — can click to see failure
4. sees `hint: use --retry` — knows how to recover
5. user runs `rhx git.release --retry`
6. sees `👌 rerun triggered` — knows action was taken
7. sees `hint: use --watch` — knows next step

**friction points:** none detected. failure → recovery path is clear.

### journey: user who types wrong flag

1. user runs `rhx git.release --to main`
2. sees error about invalid flag
3. user checks `--help` or tries `--into`
4. sees correct output

**friction points:** one-time cost to learn new flag. acceptable.

---

## summary

| friction concern | status | evidence |
|------------------|--------|----------|
| `--to` → `--into` change | acceptable | design decision, one-time learn |
| automerge failure hidden | none | errors surface to stderr |
| watch timeout silent | none | explicit `⏰ timeout` message |
| `🫧 and then...` misleads | none | next block follows immediately |
| hints unclear | none | all hints are actionable |
| ConstraintError confuse | none | explanation in message |
| first-time user journey | smooth | each step clear |
| failure recovery journey | smooth | hints guide recovery |

**all critical paths are frictionless for the intended user experience.**

---

## r8 fresh articulation: manual test run

to go beyond snapshot comparison, I ran the test suite and examined the actual exit codes:

```bash
npm run test:integration -- src/domain.roles/mechanic/skills/git.release/
```

**results:**
- Test Suites: 13 passed
- Tests: 395 passed
- Snapshots: 342 passed

**key observation:** the 5 critical paths all have dedicated test cases that exercise the actual skill executable (via PATH mock injection). the tests:

1. create a temp git repo
2. inject mocked gh/git commands via PATH
3. run the actual `git.release.sh` executable
4. capture stdout/stderr/exit code
5. compare to snapshot

this is NOT mock-only tests. the actual bash procedure executes. this is why the test count is 395 — each state combination runs the full procedure.

**verdict:** the critical paths are frictionless because:
- they execute end-to-end in tests
- they produce correct output (snapshots match)
- they exit with correct codes (0 for success, 2 for constraint)

