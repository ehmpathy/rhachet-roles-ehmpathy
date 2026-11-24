## .what
an explicit shard that matches no test reads green. `test-shards-setup` turns each `jest.*.shards.jsonc` explicit pattern into a shard with no check that the pattern still matches a file under the config's `testMatch`. in rhachet-roles-ehmpathy#1463 the repo's own shard lists still named suites it had gated off the default glob, so four shards ran, found `No tests found` with exit 0, and passed while they proved naught. the stale lists were the repo's to fix (done in #1463); the practice gap is the silence.

## .the shape of the fix
in `test-shards-setup`, list each explicit pattern's files via `jest --listTests -c <config>`; a pattern that matches no test fails `enshard` loud and names the stale entry.

## .prior art, not repeated here
the slow-test report that fails an all-skipped shard is already #788 and #829. #1463 carries a repo-local copy of that fix with a four-case test (`blackbox/report-slow-tests.integration.test.ts`), offered as the test shape for those tasks.

## .found by
rhachet-roles-ehmpathy's 0.50.0 upgrade, pr #1463
