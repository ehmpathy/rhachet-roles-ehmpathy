# self-review r1: has-pruned-backcompat

## the question

did we add backwards compatibility that was not explicitly requested?

## the review

### backwards compat concerns in the implementation

| concern | present | required |
|---------|---------|----------|
| keep pnpm fix hook | no | explicitly removed per wish |
| support old hook behavior | no | not requested |
| fallback to old behavior | no | not requested |
| deprecated aliases | no | not requested |

### analysis

the wish explicitly stated:
- "replace the extant pnpm run if present fix bs"
- "it should be removed after this change"

the implementation:
- removes the old `pnpm run --if-present fix` hook
- replaces it with `./node_modules/.bin/rhx git.repo.test --what lint`
- no backwards compat shim exists
- no fallback to old behavior exists

### did we add any backwards compat "to be safe"?

no. the only change to extant behavior was the hook replacement, which was:
1. explicitly requested by the wisher
2. confirmed multiple times ("not kept", "it should be removed")

### open questions for wisher

none. the wisher was explicit about the replacement, not addition.

## verdict

no backwards compatibility added. implementation cleanly replaces old hook with new skill.

