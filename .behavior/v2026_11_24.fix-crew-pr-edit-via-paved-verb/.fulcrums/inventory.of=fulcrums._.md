# inventory.of=fulcrums

| case | title | rework | status | confidence |
|---|---|---|---|---|
| [F1](./inventory.of=fulcrums.case=F1-pointer-in-commit-set-help.md) | no copy of the section in `git.commit.set --help`; F3 covers the set-driver | clean | ruled: stands (S1) | 65% |
| [F2](./inventory.of=fulcrums.case=F2-hint-on-found-pr-line.md) | no hint on the push tree's `pr #N (found)` line | clean | ruled: stands (S1) | 70% |
| [F3](./inventory.of=fulcrums.case=F3-pointer-in-push-header.md) | one pointer line in the booted `git.commit.push.sh` header | clean | ruled: stands (S1) | 75% |
| [F4](./inventory.of=fulcrums.case=F4-foreign-drift-out-of-scope.md) | foreign `.husky/*` drift and a `print_help` extract stay out of this change | clean | ruled: stands (S2) | 90% |
| [F8](./inventory.of=fulcrums.case=F8-pr-open-credential.md) | open the pr `--auth as-human`; every later edit follows that credential | dirty once open | ruled: as-human (S2) | 85% |
| [F5](./inventory.of=fulcrums.case=F5-prior-skips-out-of-scope.md) | the repo's prior test skips (paid llm evals, env gates) stay as they are in this pr | dirty here, clean alone | settled: stands (driver, per S2) | 85% |
| [F6](./inventory.of=fulcrums.case=F6-pr-watch-flake-deferred.md) | the `git.pull.watch` 8 KiB paginated-read flake is caught, not fixed in this pr | dirty here, clean alone | settled: stands (driver, per S2) | 80% |
| [F7](./inventory.of=fulcrums.case=F7-push-suite-fakes-stand.md) | push's suite keeps its fakes; `external.contracts.integration.test.ts` holds the real calls | clean | settled: stands (driver, per S2) | 90% |
