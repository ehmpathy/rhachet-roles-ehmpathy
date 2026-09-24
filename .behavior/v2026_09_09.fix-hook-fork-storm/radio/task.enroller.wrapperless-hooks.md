# teach the enroller: prefer wrapperless hook commands, forbid redundant execs in hooks

two lessons, measured on `ehmpathy/rhachet-roles-ehmpathy` while a wish cut a PreToolUse fork storm.
both are about **hook cost**, and the enroller is where they bind — it is the role that decides how
a hook is written into `settings.json`.

## 🔴 lesson 1 — prefer wrapperless hook commands

### what we found

`.claude/settings.json` reached every hook through an indirection:

```jsonc
"command": "./node_modules/.bin/rhachet run --repo ehmpathy --role mechanic --init claude.hooks/pretooluse.forbid-terms.gerunds"
```

that chain, read from source, is:

```
sh -c                                        1 fork
  → bin/run       (sh)   a readlink loop     ~6 forks   ($(cd $(dirname …) && pwd) ×2, $(readlink …))
  → bin/run.bun   (bash) $(cd..pwd)          ~2 forks
  → run.bun.rhachet-run.bc                   a bun binary boot (~10ms)
  → spawnSync(cmd, [], { shell: '/bin/bash' }) an EXTRA bash -c        1 fork
  → finally: bash hook.sh
```

⇒ **~10 forks plus a bun boot, to answer a question whose answer is a static path.**

and `.claude/settings.json` registers **seven** hooks that match `Write|Edit`. so a single file edit
pays that chain **seven times**.

### the fix

```jsonc
"command": "bash .agent/repo=ehmpathy/role=mechanic/inits/claude.hooks/pretooluse.forbid-terms.gerunds.sh"
```

**zero code change.** each hook derives its own data-file path from `${BASH_SOURCE[0]}`, so it
finds its neighbours from wherever it is invoked. the ported `.agent/` tree already holds every
hook **and** its `.jsonc` data.

### what we verified before we took it

`executeInit.ts:64-69` is the whole wrapper:

```ts
spawnSync(command, [], {
  cwd: process.cwd(),
  stdio: [process.stdin, process.stdout, 'pipe'],
  shell: '/bin/bash',
  encoding: 'utf-8',
});
```

| | verdict on a drop |
|---|---|
| **no `env:` option** ⇒ child inherits `process.env` | ✅ no delta |
| `cwd: process.cwd()` | ✅ no delta — claude code already invokes from the project dir |
| `shell: '/bin/bash'` with a string command | ⇒ an extra `bash -c`, removed |
| `invokeRun.ts:43-47` logs `💪 init role …` **+ 2 blank lines**, on **every** invocation | 🔴 **~21 stdout lines per edit, gone** — a token win nobody had counted |
| stderr buffered → re-framed by `InitExecutionError` | ⚠️ the `💪 init role … └─ ✋ blocked by constraints` frame vanishes; the hook's own message is untouched |

### 🔴 the objection we raised, and why it was wrong

we first **rejected** this on a read:

> *"the `rhachet run --init` indirection is what derives an init path through the symlinked
> `.agent/` tree. a direct path would harden every consumer repo against a layout that is meant to
> move."*

sound reason, false premise. the wisher supplied the fact:

> **rhachet installs the hooks exactly as they are written in the role's hook command.**

⇒ **the command string and the ported path are generated from the same role definition**, so they
do not drift apart. no step produces one without the other.

⚠️ **the tell is worth carrying:** the argument's premise was about rhachet's *intent*, and no read
of the consuming repo could check it. **a well-argued rejection whose premise lives in another
repo's head is a rejection to escalate, never to settle.**

### 🔴 the one hazard, and the guard it needs

the wrapper's dynamic lookup was **loud** on a bad reference — *"no init X found; available inits:
…"*. a direct path is not:

| | through the wrapper | wrapperless |
|---|---|---|
| a bad hook reference | fails loud, names the fix | 🔴 `bash <bad path>` exits non-2, and claude code reads non-2 as **"not blocked"** |
| what a human sees | an error | ⚠️ **the write simply lands** |

⇒ **a gate that is never invoked is a gate that never gates**, and it fails **open and silent**, in
every consumer repo, from one bad string.

🔴 **and no ordinary hook test catches it.** hook tests invoke the executable by path directly —
they pass whether or not `settings.json` points at anything real. **the config is the one artifact
under test that no test covers.**

⇒ **the enroller should ship the guard with the pattern:** a test that reads `settings.json`, walks
every hook command, and asserts each path exists and is executable. one test, and it is the only
thing standing between a typo and seven silently-disabled gates.

## 🔴 lesson 2 — forbid redundant execs in hooks

a PreToolUse hook runs on **every** matched tool call. an exec inside it is not a one-time cost; it
is a per-edit tax, paid under contention.

### the shapes we found, measured from source

| shape | where | cost |
|---|---|---|
| **`jq` per field, per item, in a loop** | `blocklist.sh:113-130` — 3 `jq` × 9 terms | **27 execs**, before any match test |
| ⚠️ **the real measured `jq` count was 33, not 27** | the same hook, run under the shim | a source read under-counted by 6 — see `.the measured delta` |
| **the same stdin parsed N times** | `blocklist.sh:39,47,51` · `gerunds.sh:38,46,50` — one `jq` each for `.tool_name`, `.tool_input.file_path`, the content | 3 execs where 1 serves |
| **`echo \| tr` per candidate word** | `gerunds.sh:74-84` inside an O(n) membership scan | 1 exec per word |
| **a config re-parsed every invocation** | `blocklist.sh:72` · `gerunds.sh:68-70` — `sed \| jq` on a file that changes ~never | 2 execs, always |
| 🔴 **the parse runs BEFORE the match test** | `blocklist.sh:72` precedes `:122` · `gerunds.sh:68` precedes `:87` | **the common case pays the full cost to learn there was naught to check** |

### the rules that follow

1. **one `jq` per payload.** emit every field you need in one invocation — `jq -r '[.tool_name,
   .tool_input.file_path] | @tsv'` — never one call per field.
2. **hoist every exec out of every loop.** an exec inside a `for` is the single most expensive
   shape bash makes easy to write.
3. 🔴 **cheap test first, expensive parse second.** most invocations match no term. a list-free
   pre-scan that exits early costs one `grep`; the parse it skips costs dozens of execs.
   ⚠️ the pre-scan must **over**-approximate — *"maybe"* where truth is *"no"* is safe; *"no"* where
   truth is *"yes"* is a silent policy hole.
4. **prefer bash primaries over execs.** `[[ -nt ]]`, `[[ =~ ]]`, `${var//x/y}`, and `mapfile` all
   cost **zero** forks. a `stat`, a `sed`, a `tr` each cost one.
5. 🔴 **do not compile the hook to fix this.** we weighed it. bash starts in ~3ms; a bun-compiled
   binary in ~10ms. a binary buys zero execs inside — which is exactly what rules 1-4 deliver ⇒ you
   would pay ~7ms of extra boot to remove execs that already cost ~3ms. **the binary makes a
   trimmed hook slower.**

### 🔴 the guard that makes it stick

a fork count in a doc drifts back on the next edit. clamp it in ci:

- a **PATH shim** at the head of `PATH`, one small wrapper per external tool, each appends its name
  to a tally file then `exec`s the real binary by absolute path
- ✅ behavior-neutral (the shim `exec`s), fork-neutral (`exec` replaces the process), deterministic
  (counts discrete events, never elapsed time — so it does not flake under load), portable (plain
  bash + a temp dir; no `strace`, no privilege)
- ⚠️ its bound: it counts external **execs**. a bare `$( )` around a pure-bash function forks
  without an exec and stays invisible. execs dominate, so it is a floor rather than a total — say
  so rather than paper over it
- 🔴 **assert two numbers, not one.** a *bar* (the limit you must stay under) and a *ratchet*
  (measured + small headroom). a clamp set at the bar lets a 4→9 regression pass green

## 🔴 the measured delta — both ends, same instrument

the counts above were read from source. they were later **measured**, by a run of the pre-fix hooks
verbatim under the same PATH shim that measures the post-fix ones:

| path | before | after | cut |
|---|---|---|---|
| 🔴 **clean write, blocklist** | **48** | **6** | **−42 (−88%)** |
| clean write, gerunds | 11 | 4 | −7 (−64%) |
| tripped, blocklist | 54 | 25 | −29 (−54%) |
| tripped, gerunds | 24 | 20 | −4 (−17%) |

per edit, both hooks together on the clean path: **59 → 10 execs**. the blocklist's `jq` alone went
**33 → 3**.

⚠️ **and the source read was WRONG by 6.** we derived `27 jq` from `3 × 9 terms`; the hook actually
spends **33**. ⇒ **a derived baseline is a hypothesis.** the measurement costs one throwaway harness
— check out the pre-fix file, point the same shim at it, record, delete — and it is the difference
between *"we think this got cheaper"* and *"here are both numbers."*

## the arithmetic that ordered the work

per edit, estimated — **published startup figures, not measured on the box**:

| lever | saves | scope |
|---|---|---|
| trim the execs inside each hook | ~48ms | the 2 hooks we owned |
| 🔴 **drop the wrapper** | **~175ms** | **all 7 hooks** |
| compile to a binary | −7ms | (negative) |

⇒ **the biggest lever was the one that needed no code change at all**, and it sat in the first line
of the cpu roll-up we were handed — one line **above** the two lines the wish filed against.
**nobody read the parent.**

## provenance

- route: `ehmpathy/rhachet-roles-ehmpathy` @ `beav/fix-hook-fork-storm`,
  `.behavior/v2026_09_09.fix-hook-fork-storm/`
- the levers, parted and verdicted: `1.vision.yield.md` → `.the three levers`
- the wrapper read: `1.vision.yield.md` → `.what the wrapper does that a direct bash does not`
- the ruling: `.fulcrums/inventory.of=fulcrums.case=F7-drop-the-wrapper.md`
- the reach guard: `1.vision.experience.case=6.hook-maintainer.fork-clamp-bites.md` `[t4]`

⚠️ **every millisecond figure here is an estimate.** the fork counts and the chain shape are read
from source and are firm; the timings are published averages. a `hyperfine` on one invocation
settles them, and the **order** of the levers does not depend on it.
