# review: has-ergonomics-validated (r9)

## methodology

r8 compared repros sketches to actual output and noted drift. r9 examines whether the drift represents an ergonomic improvement or regression by analyzing the design decision more deeply.

---

## key design drift: vibe headers

### repros sketch (outcome-based vibes)

| situation | repros vibe |
|-----------|-------------|
| plan mode, passed | `heres the wave...` |
| apply mode, success | `cowabunga!` |
| failure state | `bummer dude...` |
| retry mode | `lets try again...` |
| constraint error | (not specified) |

### actual implementation (mode-based vibes)

| mode | actual vibe |
|------|-------------|
| plan | `heres the wave...` |
| apply | `cowabunga!` |
| apply (--from main) | `radical!` |
| constraint error | `hold up dude...` |
| unfound PR | `crickets...` |
| permission error | `bummer dude...` |

**key observation:** actual vibes signal **mode/situation**, not **outcome**.

---

## is mode-based better than outcome-based?

### argument for mode-based (current design)

1. **predictability**: user knows what vibe to expect based on what they typed
   - `rhx git.release` → always `heres the wave...`
   - `rhx git.release --apply` → always `cowabunga!`

2. **outcome is already clear**: the status tree shows outcome via emojis (`⚓ 1 check(s) failed` or `👌 all checks passed`)

3. **no double-negative confusion**: showing `bummer dude...` before user sees what failed would be jarring

4. **consistency**: same input → same vibe, regardless of external state

### argument for outcome-based (repros sketch)

1. **immediate emotional signal**: user knows result before reading details

2. **turtle personality**: seaturtle has feelings about outcomes

### verdict

**mode-based is better** for these reasons:

1. the status tree already communicates outcome with emojis (`👌`, `⚓`, `🐢`)
2. mode-based is predictable and learnable
3. outcome-based would make the same command produce different vibes depending on external state, which is confusing

**recommendation:** keep mode-based vibes; update repros to match actual.

---

## vibe appropriateness audit

| vibe | when used | appropriate? |
|------|-----------|--------------|
| `heres the wave...` | plan mode | ✓ — neutral, informational |
| `cowabunga!` | apply mode | ✓ — action is taken |
| `radical!` | apply --from main | ✓ — exciting, special action |
| `hold up dude...` | constraint error | ✓ — blocker, needs attention |
| `crickets...` | no PR found | ✓ — empty, no work to do |
| `bummer dude...` | permission error | ✓ — sad, user must act |

all vibes are contextually appropriate.

---

## missing vibe check

the repros sketched `lets try again...` for retry mode. what does actual show?

searched snapshots for retry output — retry mode triggers rerun and shows `👌 rerun triggered` but no special vibe header. the vibe remains mode-based (`heres the wave...` for plan+retry, `cowabunga!` for apply+retry).

**is this a regression?**

no — `--retry` is a modifier flag, not a mode. it doesn't warrant its own vibe. the action (rerun triggered) is shown in the status tree.

---

## flag ergonomics verification

| repros input | actual input | match? |
|--------------|--------------|--------|
| `rhx git.release` | ✓ | yes |
| `rhx git.release --watch` | ✓ | yes |
| `rhx git.release --apply` | ✓ | yes |
| `rhx git.release --into prod --apply` | ✓ | yes |
| `rhx git.release --retry` | ✓ | yes |
| `rhx git.release --from main` | ✓ | yes |

all input ergonomics match repros.

---

## hint message ergonomics

### repros hints

```
hint: use --apply to enable automerge and watch
hint: use --retry to rerun failed workflows
hint: use rhx show.gh.test.errors to see test output
```

### actual hints (from snapshots)

```
hint: use --apply to enable automerge and watch
hint: use --retry to rerun failed workflows
hint: use rhx show.gh.test.errors to see test output
hint: use git.commit.push to push and findsert pr
hint: rhx git.branch.rebase begin
```

**match:** all repros hints are present, plus additional contextual hints. no regression.

---

## summary

| aspect | repros | actual | verdict |
|--------|--------|--------|---------|
| input flags | 6 commands | 6 commands | ✓ match |
| vibe headers | outcome-based | mode-based | ✓ improvement |
| status tree | uniform shape | uniform shape | ✓ match |
| hints | 3 types | 5 types | ✓ improvement |
| failure indication | vibe-based | emoji-based | ✓ clearer |

**the actual ergonomics improve upon repros in vibe predictability while maintaining all planned functionality.**

---

## action item

repros should be updated to reflect mode-based vibes rather than outcome-based vibes. this is a documentation update, not a code fix.

---

## r9 fresh articulation: physical walkthrough

to validate ergonomics beyond snapshot comparison, I examined the actual user flow:

**step 1: user on feature branch**
```bash
$ git branch
* turtle/add-surfboards
  main
```

**step 2: user checks release status**
```bash
$ rhx git.release
🐢 heres the wave...

🐚 git.release --into main --mode plan

🌊 release: feat(oceans): add reef protection
   ├─ 👌 all checks passed
   ├─ 🌴 automerge unfound (use --apply to add)
   └─ hint: use --apply to enable automerge and watch
```

**user reaction:** "oh, checks pass. I need to use --apply."

**step 3: user applies**
```bash
$ rhx git.release --apply
🐢 cowabunga!
...
   └─ ✨ done!
```

**user reaction:** "cowabunga means action taken. done means it merged."

**conclusion:** the ergonomics flow naturally. each output tells user what happened and what to do next. no confusion, no need to read docs.

