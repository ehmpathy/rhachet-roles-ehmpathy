# rule.require.price-the-measure-point

> **a measure added to every call is a hot path itself. price it (cpu, wall, execs, forks, reads) before it ships, and put it where it costs least: once at the dispatcher, never a shim per hook.**

## .the table to fill

| measure point | added cpu | added wall | added execs | added forks | added read calls |
|---|---|---|---|---|---|
| dispatcher (per extra hook entry) | +3.8 ms | +5.4 ms per event | 0 | +1 (a subshell) | +14 |
| shim per hook, clean path | +7.0 ms | +7.0 ms | +1 | +1 | +12 |
| shim, skip path | +0.52 ms | +0.51 ms | +1 | 0 | n/a |

figures: a calm 36-core box, 30 interleaved runs, paired medians, one hook entry per event, noise about 0.5 ms. a delta under 1 ms reads as about naught.

## .the rules of the price

- a measure that adds an exec per call pays that start times every hook of every seat: 118 rules would pay 118 shim starts where one dispatcher patch serves them all
- price on a calm box; interleave the variants so one load window hits all; take paired medians. a loaded box prices its own load
- read the kernel's own cpu (`os.wait4`, or bash `times` in the measure subshell), not a 10 ms tick: `/proc/self/stat` cutime reads 0 for a 3 ms hook
- count the measure's reads: a here-string `read -a <<<` took the pipe a byte per call, 309-314 reads per hook entry for no cpu gain; split by word and `read -d ''` took it to 14
- a measure with no live source (bash has no live spawn count) stays a suite assertion, not a live bound: a counter that reads 2 execs as 5 strikes a false quarantine

## .the case (2026-11-26, uladkasach/nheuron)

the dispatcher won: +3.8 ms cpu per extra hook entry and 0 execs, against +7.0 ms and 1 exec per shim (1.8x less).

## .enforcement

- a measure shipped on every call with no price line = **blocker**
- a per-hook shim where one dispatcher patch would serve = **blocker**
- a live bound on a counter that reads wrong under load = **blocker**

## .see also

- `rule.forbid.costly-hot-paths`
- `rule.require.count-starts-with-strace`
