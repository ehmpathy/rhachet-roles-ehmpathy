# F4 — "under 10 processes" is read as an exec count

**rework** clean · **status** open · **confidence** 70%

## .the fork, stated fairly

acceptance #1 says *"forks **under 10 processes total, per hook** — measured"*. two reads:

| read | counts | instrument |
|---|---|---|
| **external command execs** | `jq`, `grep`, `sed`, `tr`, `sort`, `mktemp`, `sha256sum`, `cut`, `date`, `mv`, `cat` | ✅ **taken** — the PATH shim (F2) |
| **every fork**, execs plus bare subshells | the above, plus each `$( )` around a pure-bash function | needs `strace` or a pid namespace |

## .taken, and why at the time

- **it is what the wish itself counts.** its fact list is entirely execs: "three `jq` calls per
  term", "an `echo \| tr` per word", "`sed \| jq` on every invocation". not one bare subshell is
  named.
- **execs dominate.** an exec pays a fork *plus* a binary load *plus* a dynamic link. a bare
  subshell pays a copy-on-write fork and no more.
- **only this read has a portable, deterministic instrument** (F2). the alternative either flakes
  or depends on a binary ci may lack, and to skip on its absence is a failhide.

## .rework, and why clean

it is a definition in a test's assertion, plus a line in the yield. tighten the read later and the
same shim gains a companion; no production line changes.

## .confidence, and why it is 70%

the wish says **"processes"**, and a bare subshell *is* a process. so the narrower read is a best
guess at the wisher's intent, argued from the evidence of what they counted — not from what they
wrote. that gap is the 30%.

⇒ **the mitigation is honesty, not precision.** the yield reports the exec tally as a **floor**,
names the residue explicitly, and lets the wisher tighten it. see Q4.

## .where

- `case=6` (the demo) · `1.vision.yield.md` `.open questions` Q4 · assumption A3

## .the verdict

*(unruled — awaits the council)*
