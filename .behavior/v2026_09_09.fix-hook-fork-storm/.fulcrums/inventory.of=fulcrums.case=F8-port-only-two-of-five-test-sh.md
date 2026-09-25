# F8 — port only two of the five hook `.test.sh` files

- **rework** = clean
- **status** = 🔴 **DISSOLVED** — the fork was never real. see `.the verdict`
- **confidence** = 87% at the call · **the 13% was the right 13%**
- **called** = 2026-09-10, at execution, the moment the glob returned five rather than two
- **closed** = 2026-09-12, after peer r1 graded the deferral a blocker

## .the fork, stated fairly

`rule.require.jest-tests-for-skills` grades a `.test.sh` file a **blocker**, with no
qualifier on which one:

> `.test.sh` files = blocker

the hook dir held five. the wish opens two of them. so:

| | port all five | port the two the wish opens |
|---|---|---|
| rule satisfied | ✅ fully | ⚠️ partly — three blockers stay |
| diff size | ~5 × 200 lines of test, three for hooks this wish never reads | the two already written |
| review risk | 🔴 three ports of hooks nobody on this route has read | each port is of a hook whose behavior this drive already had to grasp exactly |
| wish boundary | breached — *"do not touch the other PreToolUse hooks"* | honored |

## .taken, and why at the time

**port the two, catch a dream for the three.**

1. **the wish's boundary names this case directly.** *"do not touch the other PreToolUse
   hooks unless a shared-cost fix genuinely lands there too — and if it does, say so
   plainly rather than expand the diff quietly."* lever B **did** land on all seven, and
   what it changed was each hook's **invocation**, in a config file. it touched no hook's
   code and no hook's tests. a test rewrite is a different diff, on a different subject.
2. 🔴 **a careless port asserts less than the shell file it replaces, and reads as more.**
   the two ports done here each needed a full pass over the shell assertions to carry them
   forward one for one — `blocklist.test.sh` merges streams with `$(… 2>&1)`, so every
   assertion needed a **decision** about which stream it belongs to. that decision cannot
   be inherited, and three more of them is the expensive half of the work, not the cheap
   half.
3. **the three are already excluded from the build.** `build:complete:dist` carries
   `--exclude='**/inits/**/*.test.sh'`, so they never reach `dist/` and never reach a
   consumer repo. the blocker is real and its blast radius is this repo's own ci.

## .rework, and why

**clean.** the three `.test.sh` files are untouched, so a later port starts from exactly
the state this route found. no caller hardens against the choice, and no work here builds
on it — the two ports that were done stand on their own.

## .confidence, and why it is not higher

**87%.** the boundary reads on this case, and the rule reads the other way, so the call
turns on which authority governs — and this drive has already been ruled against once on a
question of that shape (F1, where the wisher's appetite for churn was not ours to infer).

what holds it at 87 rather than lower: `rule.always.fix-forward-under-scouts-honor`'s test
is **SAFE and CLEAN**, and the three ports fail CLEAN plainly — they ripple into files this
change never intended to open. ⇒ a deferral for dirt is the rule's own prescribed answer,
and it owes a dream plus this fulcrum, both of which exist.

## .where

- the three files: `src/domain.roles/mechanic/inits/claude.hooks/pretooluse.{forbid-stderr-redirect,forbid-suspicious-shell-syntax,forbid-test-background}.test.sh`
- the dream: `.dream/v2026_09_10.fix.three-hook-test-sh-files-remain.md`
- the two that were ported: `pretooluse.forbid-terms.{blocklist,gerunds}.integration.test.ts`

## 🔴 .the verdict — DISSOLVED, 2026-09-12

**there was no fork.** peer r1 graded the deferral a blocker and asked for one of two doors: port
the three, or get a wisher override. the check that ask forced found a third state neither of us
had looked for:

| the `.test.sh` | a `.integration.test.ts` beside it? | what it actually was |
|---|---|---|
| `pretooluse.forbid-test-background.test.sh` | ✅ **yes**, 6 cases | a superseded duplicate |
| `pretooluse.forbid-suspicious-shell-syntax.test.sh` | ✅ **yes**, 15 cases | a superseded duplicate — **and a stale one** |
| `pretooluse.forbid-stderr-redirect.test.sh` | 🔴 **no** | the one genuine gap |

⇒ **the cost was one port and two deletions, never three ports.** the CLEAN verdict — *"they ripple
into files this change never intended to open"* — was computed against a diff three times the size
of the real one. with the true cost in hand, SAFE ✅ + CLEAN ✅, so
`rule.always.fix-forward-under-scouts-honor` says do it now, and it was done.

### 🔴 the second file was STALE, which raises the harm this fulcrum weighed

three of `forbid-suspicious-shell-syntax.test.sh`'s allows contradict the jest suite that governs
the same hook today:

| the `.test.sh` asserted | the jest suite asserts |
|---|---|
| `cat file.txt > output.txt` → **allowed** | **blocked** — *"output redirection"* |
| `echo $(date)` → **allowed** | **blocked** — *"command substitution"* |
| `arr=(1 2 3)` → **allowed** | **blocked** — a documented false positive |

⇒ **it would have failed if anyone had run it, and nobody had.** so the harm was not "a rule
violation persists in ci" — it was **a file on record that states the opposite of the hook's
contract**, which is worse than an absent test.

## ⚠️ .the lesson, and it is about the fulcrum rather than the verdict

this fulcrum's whole argument rested on one clause:

> *"a careless port asserts less than the shell file it replaces"* — and, from the dream,
> *"each of the three is the only coverage its hook has."*

**that clause was false for two of the three, and a single `ls` of the hook dir would have refuted
it.** every step above the premise was sound; the premise was never checked.

⇒ 🔴 **a fulcrum that rests on an unchecked premise reserves the WRONG question for the council** —
and it reserves it convincingly, because the argument around it is careful. the cost is a human's
attention spent on a fork that does not exist.

⇒ the confidence line was right to sit at 87 rather than higher. **what it named as the risk (the
boundary-versus-rule authority question) was not the risk that fired.** the 13% was the premise.
