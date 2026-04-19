# self-review: has-questioned-requirements

## requirements in the vision

### 1. add `--filter` flag to map to `--testNamePattern`

**who said?** my interpretation of the wish

**what evidence?** the wish shows `-- --testNamePattern "..."` which is awkward

**what if we didn't?** users would still need the raw escape hatch for test name filters

**could we achieve simpler?** 

considered: "just use `--scope`"
- rejected: `--scope` maps to `--testPathPatterns` (file paths)
- `--testNamePattern` filters test case names within files
- these are fundamentally different use cases
- example: `--scope invoice` runs all tests in files match "invoice"
- example: `--filter invoice` runs all tests with "invoice" in their describe/test name

**verdict:** requirement holds. `--filter` adds genuine value for a use case `--scope` cannot serve.

### 2. block raw `-- --testNamePattern` with guidance

**who said?** the wish says "failfast guide away"

**what evidence?** someone used `--what acceptance -- --testNamePattern "..."`

**what if we didn't?** 

two paths:
- a) add `--filter` only, let old way work → no migration pressure
- b) add `--filter` and block old way → forces discovery of ergonomic path

**is scope misdirected?**

the wish specifically says "failfast" which implies block, not warn.

**verdict:** requirement holds per wish intent. block with clear guidance is the ask.

### 3. allow other raw `--` args to pass through

**who said?** my assumption (not in wish)

**what if not?** users couldn't pass `--verbose`, `--coverage`, etc.

**scope question:** is this necessary for the wish?

the wish only mentions `--testNamePattern`. block that specific pattern and allow others seems like reasonable scope containment. but this adds complexity.

**verdict:** requirement is scope creep. the wish doesn't ask for this nuance.

**revised approach:** 
- block ALL raw `--` passthrough (simpler)
- if users need `--verbose` etc, we can add `--verbose` flag later
- or: just block `--testNamePattern` specifically as stated

i'll defer to the wisher on this tradeoff.

## summary

| requirement | verdict |
|-------------|---------|
| add `--filter` | holds - genuine use case |
| block `-- --testNamePattern` | holds - wish says "failfast" |
| allow other raw args | question for wisher - scope creep? |

## open to wisher

should we:
- a) block only `--testNamePattern` (narrower, as stated)
- b) block all `--` passthrough (simpler, but more restrictive)

i leaned toward (a) in the vision but acknowledge (b) is simpler.
