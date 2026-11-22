# F2: one halt render for default and explicit bounds

- fork: say "woah, too slow" only on a default-bound halt, or on every halt
- taken: every halt. one path, no branch; a `bound: Ns (default|--timeout)` line names the source
- rework: clean. a conditional on the header text
- confidence: 90%
- where: `git.repo.test.sh:1686-1718`
- verdict: open
