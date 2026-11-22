# F20: the bound suite fails loud on a host with no gnu timeout or setsid, never skips

- fork: the shim cases (1-4) and [case15] throw `ConstraintError` when the host lacks gnu `timeout` or `setsid`, or they skip or gate on the tool
- taken: throw. `rule.require.failfast` (tests) makes an absent resource a loud failure with a hint, and `philosophy.verification-strictness` forbids skips; a gated case is a skip by another name. the hint names the cure (`brew install coreutils`). the no-fuse paths the feature adds for stock macos are proven by cases that need no gnu tool ([case7], [case13], [case14]), so a mac with coreutils runs the whole suite, and the cases that need gnu `timeout` say so at once
- rework: clean. one guard per util
- confidence: 85%
- where: `genTimeoutShim` and [case15] in `git.repo.test.bound.integration.test.ts`
- verdict: disputed at verification review
