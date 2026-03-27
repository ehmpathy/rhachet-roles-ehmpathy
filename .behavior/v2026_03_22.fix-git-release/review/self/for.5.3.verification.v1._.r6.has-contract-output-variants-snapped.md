# review: has-contract-output-variants-snapped (r6)

## methodology

r5 verified snapshot counts and mapped variants. r6 skeptically examines whether the snapshots actually capture what callers see.

---

## skeptical examination: do snapshots capture real output?

### question 1: are ANSI codes preserved or stripped?

**evidence from snapshot lines 8, 17, 52:**

```
└─ [2mhint: use git.commit.push to push and findsert pr[0m
```

the `[2m` and `[0m` are ANSI codes (dim text). these are **preserved** in snapshots, which means:

- ✓ snapshots show exactly what terminal users see
- ✓ color/style changes would be detected in diffs

**verdict:** holds — ANSI codes preserved

### question 2: are timestamps normalized?

**evidence from snapshot line 40, 66:**

```
✨ done! Xs in action, Xs watched
```

timestamps are replaced with `Xs` placeholder. this is done by `asTimeStable()` function (test line 439).

**grep verification:**

```bash
grep "asTimeStable" git.release.p3.*.test.ts
```

all p3 tests use `asTimeStable()` before snapshot.

**verdict:** holds — timestamps normalized for determinism

### question 3: are all exit codes captured?

snapshots capture stdout only. exit codes are verified via separate `expect(result.status).toEqual(N)` assertions.

**evidence from test line 440:**

```typescript
expect(asTimeStable(result.stdout)).toMatchSnapshot();
expect(result.status).toEqual(2);
```

**verdict:** holds — exit codes explicitly asserted (not in snapshot, but verified)

### question 4: is stderr captured?

**potential gap found.**

examined test structure:

```typescript
return {
  stdout: result.stdout || '',
  stderr: result.stderr || '',
  status: result.status ?? 1,
};
```

tests capture stderr but most assertions only check stdout:

```typescript
expect(asTimeStable(result.stdout)).toMatchSnapshot();
```

**searched for stderr assertions:**

```bash
grep "stderr" git.release.p3.*.test.ts | grep -v "result.stderr" | grep expect
```

**result:** stderr is captured but not consistently snapped.

**mitigation:** the skill writes to stdout, not stderr, for user-visible output. stderr is reserved for fatal errors. the vision output examples show `🐢` vibes on stdout.

**verdict:** minor gap — stderr not snapped, but skill design puts output on stdout

---

## deep dive: are all output variants from vision present?

### vision output variants (from 1.vision.md)

| variant | vision example | snapshot verified |
|---------|----------------|-------------------|
| `🐢 heres the wave...` | plan mode header | ✓ line 45 |
| `🐢 cowabunga!` | apply success | ✓ line 31, 70 |
| `🐢 crickets...` | no PR found | ✓ line 4, 13, 21 |
| `🐢 bummer dude...` | constraint error | ✓ on_main.into_main |
| `🌊 release: {title}` | transport status | ✓ line 35, 49 |
| `👌 all checks passed` | passed state | ✓ line 76 |
| `🐢 N check(s) in progress` | inflight state | ✓ line 36, 50 |
| `⚓ N check(s) failed` | failed state | ✓ (verified in p3.on_feat.into_prod) |
| `🌴 automerge unfound` | wout-automerge | ✓ line 51 |
| `🌴 automerge enabled [added]` | apply added | ✓ line 37, 77 |
| `🌴 automerge enabled [found]` | already had | ✓ (verified in p2) |
| `🌴 already merged` | merged state | ✓ (verified in p3.on_feat.into_prod) |
| `🥥 let's watch` | watch header | ✓ line 38, 64 |
| `💤 N left, Xs in action` | poll cycle | ✓ (verified in p3.on_feat.into_prod) |
| `✨ done!` | watch complete | ✓ line 40 |
| `🫧 and then...` | transport transition | ✓ (verified in p3.on_feat.into_prod) |
| `🫧 no open branch pr` | unfound hint | ✓ line 6, 15, 24 |

**all 17 vision output variants have snapshot coverage.**

---

## edge case verification

### edge case 1: rebase:behind

**test:** `[row-19] feat PR: rebase:behind`

**snapshot contains:** `🐚 needs rebase` hint

### edge case 2: rebase:dirty (conflicts)

**test:** `[row-22] feat PR: rebase:dirty`

**snapshot contains:** rebase + conflict hints

### edge case 3: multiple transports

**p3.on_feat.into_prod snapshots show full chain:**

```
🌊 release: feat(oceans): add reef protection
   └─ 🌴 already merged

🫧 and then...

🌊 release: chore(release): v1.33.0 🎉
   ├─ 👌 all checks passed
   ...
```

✓ transport transitions captured

---

## hostile reviewer questions

**Q: how do you know the snapshots match what a real user sees?**

A: the tests use `spawnSync('bash', [SKILL_PATH, ...args])` which executes the real skill. the stdout captured is exactly what would appear in terminal. ANSI codes are preserved.

**Q: could a snapshot drift without detection?**

A: no — jest snapshot comparison would catch any change. the CI runs `npm run test:integration` which would fail on drift.

**Q: are the mocks realistic?**

A: the mocks return JSON that matches real `gh pr view --json` output structure. the test file (lines 40-140) shows comprehensive mock generation for all PR states.

---

## summary

| check | status | evidence |
|-------|--------|----------|
| stdout captured | ✓ | `result.stdout` in all tests |
| ANSI preserved | ✓ | `[2m...[0m` in snapshots |
| timestamps normalized | ✓ | `asTimeStable()` in all tests |
| exit codes verified | ✓ | explicit `expect(status)` |
| stderr gap | minor | skill outputs to stdout |
| all 17 vision variants | ✓ | cross-referenced above |
| edge cases | ✓ | rebase:behind, rebase:dirty, multi-transport |

**all critical output variants have snapshot coverage. minor gap on stderr is design-mitigated.**

