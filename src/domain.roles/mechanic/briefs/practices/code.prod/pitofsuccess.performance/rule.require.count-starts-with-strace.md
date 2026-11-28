# rule.require.count-starts-with-strace

> **a hot-path change counts its process starts and forks with `strace -f`, with `BASH_ENV` and `ENV` stripped from the env. wall alone hides a fork.**

## .why wall is not enough

wall is cpu plus the wait for a cpu. on a loaded box the wait dominates and each forked process pays it again: the stock check-permissions read 5512 ms wall (p95 10115) at 710 ms cpu. a fork can cost 1 ms on a calm box and vanish into noise; the count does not move with load.

## .how

```
env -u BASH_ENV -u ENV strace -f -qq -o <out> -e trace=execve,vfork,fork,clone,clone3,open,openat bash <hook> < <payload>
```

- starts = successful `execve` beyond the hook's own bash (start the count at -1)
- forks = `clone`, `clone3`, `vfork`, `fork` calls
- reads = read-only `open` or `openat` of a path that is not the loader, a lib, the locale, `/proc`, `/dev`, or a shell here-string temp
- strip `BASH_ENV` and `ENV`: a box's own shell setup file adds a read, and a start, to every run
- warm the caches first: the first call builds them
- name the files read, not only count them, so a new read breaks the suite
- assert the counts in the suite (`expect(after.starts).toEqual(0)`); where strace is absent, print `COUNTS unavailable` and assert on the parity corpus alone

## .the case (2026-11-26, uladkasach/nheuron)

- check-permissions, one clean allowed call: fast head 0 starts, 0 forks, 4 named reads (the hook, the layer lib, the allowlist cache, the syntax cache); the stock chain 12-13 starts, 31 forks, 9 reads over four hooks
- a dispatcher patch read 309-314 reads per hook entry from a here-string `read -a <<<` (one byte per call); cpu was the same within noise, so wall hid a +300-syscall defect that strace showed

## .enforcement

- a hot-path change that claims fewer starts with no strace count = **blocker**
- a count taken with `BASH_ENV` or `ENV` set = **nitpick**

## .see also

- `rule.forbid.costly-hot-paths`
- `rule.require.price-the-measure-point`
