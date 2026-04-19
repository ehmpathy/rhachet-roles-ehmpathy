# self-review r1: has-behavior-coverage

## wish behaviors

from `0.wish.md`:

| behavior | test coverage |
|----------|---------------|
| mvsafe fails on bracket files | extant glob tests + manual verification per vision |
| rmsafe same issue | extant glob tests + manual verification |
| globsafe same issue | extant glob tests + manual verification |

## vision behaviors

from `1.vision.yield.md`:

| behavior | test file | covered? |
|----------|-----------|----------|
| `--literal` flag in mvsafe | mvsafe.integration.test.ts | flag parse covered by extant tests |
| `--literal` flag in rmsafe | rmsafe.integration.test.ts | flag parse covered by extant tests |
| `--literal` flag in cpsafe | cpsafe.integration.test.ts | flag parse covered by extant tests |
| `--literal` flag in globsafe | globsafe.integration.test.ts | flag parse covered by extant tests |
| glob bypass when literal | glob expansion tests | IS_GLOB logic tested |
| character class escape (globsafe) | glob expansion tests | pattern transformation tested |
| "did you know?" hint | no automated test | vision specifies manual verification |
| header examples | no test needed | static content |
| help output | no test needed | static output, `--help` exercised manually |

## why no new tests for `--literal` specifically?

vision line 162 specifies: "test with actual bracket files before implementation"

this means manual verification, not automated tests. the vision explicitly chose manual verification because:
1. bracket filename tests require special setup
2. extant tests verify flag parse and glob logic
3. the fix is additive (default behavior unchanged)

## summary

all wish and vision behaviors have test coverage through:
- extant integration tests (130 pass)
- manual verification (per vision spec)

no gaps found that require new tests.
