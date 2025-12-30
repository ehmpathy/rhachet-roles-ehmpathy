# howto: diagnose via bisection

## .what

use binary search (bisection) to isolate the root cause of a defect in O(log n) steps instead of O(n)

## .why

- linear search through suspects wastes time
- bisection cuts the search space in half with each test
- works for code changes, data inputs, config options, and time ranges
- essential skill to debug regressions and intermittent failures

## .how

### the pattern

1. define the search space (lines, inputs, configs, changes)
2. find a known-good state and a known-bad state
3. test the midpoint
4. if midpoint is good → defect is in the second half
5. if midpoint is bad → defect is in the first half
6. repeat until you find the exact boundary

### code bisection (for logic errors)

when a function produces wrong output:

```ts
// suspect: 10 lines of logic
const result = complexTransform(input);

// bisect: comment out bottom half, test
// if still broken → defect in top half
// if fixed → defect in bottom half
// repeat until isolated to 1-2 lines
```

### input bisection (for data issues)

when a process fails on large input:

```ts
// 1000 records fail; which one causes it?
const midpoint = Math.floor(records.length / 2);
const firstHalf = records.slice(0, midpoint);
const secondHalf = records.slice(midpoint);

// test each half separately
// defect is in the half that fails
// repeat until you find the single bad record
```

### config bisection (for env issues)

when config changes break behavior:

1. list all config differences between known-good and broken
2. apply half the changes
3. test → narrow to the half that breaks
4. repeat until isolated to single config key

## .when to use

- regression appeared but unclear which change caused it
- feature works with small data but fails with large data
- behavior differs between environments
- any scenario with a "it used to work" vs "now it's broken" boundary

## .key insight

> the power of bisection: 1000 suspects → 10 tests max

always prefer structured bisection over random guess or linear elimination
