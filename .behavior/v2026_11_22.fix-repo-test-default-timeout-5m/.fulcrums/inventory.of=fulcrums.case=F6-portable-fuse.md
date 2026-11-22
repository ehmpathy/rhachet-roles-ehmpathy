# F6: host without gnu `timeout`: fall back, never fail

- fork: on a host with no `timeout` (stock macOS), (a) fail loud and name `brew install coreutils`, (b) run unbounded with a warn, or (c) fall back `gtimeout` → a bash watchdog
- taken: (c). (a) breaks every run on such a host for a feature the caller never asked for; (b) drops the wish on that host. a watchdog (background the run in its own group, sleep the bound, signal the group) keeps the bound everywhere
- rework: clean. one lookup function around the extant wrap
- confidence: 75%. a bash watchdog must signal the whole tree without `setsid` (absent on macOS); `set -m` job control gives the run its own group, but that needs proof on both hosts
- where: `git.repo.test.sh:1254-1259`
- verdict: open
