# F3 — cache the word list, keyed on mtime + size

**rework** clean · **status** 🔴 **leans reject** · **confidence** 80%

## 🔴 .the requirement audit that moved this fulcrum

challenged at review r2 `has-questioned-requirements`: **who asked for a cache?**

**nobody.** the wish asks for fewer forks. it never names a cache. the cache is a *means* invented
at the vision, and it is the only proposed change in the whole route that **adds a defect class
that does not exist today** (`case=4`).

⇒ so it must clear a bar the other levers do not: *what does it buy, net?*

| the lever | forks removed | defect class added |
|---|---|---|
| one `jq` over stdin, not three | 2 | none |
| collapse the per-term `jq` loop | up to 26 | none |
| read the clock early | up to ~10 on the retry path | none |
| cheap pre-scan ahead of the parse | ~2–3 on the clean path | none |
| **the cache** | **~2 (`sed` + `jq`), minus its own read + write** | 🔴 **stale policy, silent** |

**the four free levers plausibly clear acceptance #1 on their own.** the cache is the fifth, the
smallest, and the only one that can make the hook *wrong*.

🔴 **the lowest-confidence call in the route, and the only one that can break policy silently.**

## .the fork, stated fairly

| option | freshness | cost | why rejected / taken |
|---|---|---|---|
| **no cache — re-read every time** | exact, by construction | a `sed \| jq` per invocation | the safe floor; kept as the fallback |
| **cache keyed on mtime + size** | exact unless a list edit preserves both | one `stat` | ✅ **taken**, provisionally |
| cache keyed on content hash | exact | a full read + hash — the cost we came to remove | rejected — self-defeating |
| cache with a ttl | **stale for up to the ttl** | one `date` | 🔴 rejected — a window where policy is silently reverted |
| cache with no invalidation | never fresh | free | 🔴 rejected outright |

## .taken, and why at the time

freshness is free today only because the wasteful read is unconditional — and that read is the
wish's target. so a cache must buy freshness back with a cheaper witness of list identity.

mtime + size is the cheapest exact-enough witness: a text edit to a `.jsonc` changes the mtime;
the size guards the rare same-second rewrite. one `stat` costs a small fraction of a `sed | jq`.

## .rework, and why clean

the cache is one guarded block inside the hook. delete it and the hook falls back to the
unconditional read — the behavior it has today. no caller hardens against it.

## 🔴 .the asymmetry that governs the design

> a cache that invalidates **too often** costs a parse. a cache that invalidates **too rarely**
> costs the **policy** — with no error, no log line, and no failed test.

the two errors are not symmetric, so the witness must err toward re-parse. `case=4` `[t4]` pins
that a false invalidation is harmless; `case=4` `[t1]`/`[t2]` pin that a missed one is not.

## .confidence, and why it is 65%

two unknowns remain, and the third — the one that set 65% — is now closed:

1. **A2** — is the witness cheaper than the parse it replaces? ✅ **settled at review r5, and the
   question was malformed.** it presumed a `stat`. no `stat` is owed: `[[ "$A" -nt "$B" ]]` is a
   bash conditional primary — an mtime compare at **zero forks, zero execs**. this repo already
   ships that check (`brief.compress.sh:289-291`, a `.min` skipped when newer than its source).
   read is `$(<"$CACHE")`, write is `printf >` — neither an exec. ⇒ steady state **0 execs**
   against the `sed | jq` **2** it replaces
2. **A4** — 🔴 **restated at r5; the old text named the wrong threat.** a **checkout** was listed
   as a defeat and is not one: git stores no mtimes, so a checkout writes fresh and the clock
   **advances** — the cache correctly invalidates. what actually defeats the witness is an mtime
   that moves **backwards** (`cp -p`, `rsync -a`, `tar -xp`, `touch -r`) or a same-second rewrite.
   ⚠️ **and the two are not the same size:** a same-second tie heals on the next edit; a backwards
   mtime is **permanent**, cleared only by a delete of the cache file. now `case=4` `[t5]`.
   🔴 `-nt` is mtime-only, so the `+ size` half of this fulcrum's own title costs a `stat` to
   keep — the free witness is strictly weaker than the named one
3. ~~where would the cache even live?~~ ✅ **closed.** a file, and the file is nearly free

⇒ the 65% was set by point 3, and point 3 dissolved. **enumerated in the vision as Q9** — it had
been recorded only here, where no reader of the vision would meet it.

## 🔴 .the verdict does NOT move, and the reason matters

a cheaper cache is still a cache **nobody asked for**. the requirement audit above is untouched:
this remains the only proposed change that adds a defect class the code does not have today, and
the four free levers still clear acceptance #1 without it.

⇒ so **`leans reject` stands, now on its strongest ground rather than its weakest.** what changes
is the *confidence*, from 65% to ~80% — the uncertainty shrank, the argument did not.

⚠️ **had point 3 been the whole case, this fulcrum would have flipped to `take` on a bash trivium.**
a call propped up by an unexamined cost estimate is a call one measurement away from reversal.

## .the standing instruction if it collapses

**carry no cache.** take the other levers — one stdin `jq`, the collapsed per-term loop, the early
clock read, the cheap pre-scan. they alone meet acceptance #1. a correct hook that saves eight
forks beats a fast hook that lies.

## .where

- `pretooluse.forbid-terms.blocklist.sh:72` · `pretooluse.forbid-terms.gerunds.sh:68-70`

## .the verdict

*(unruled — awaits the council)*
