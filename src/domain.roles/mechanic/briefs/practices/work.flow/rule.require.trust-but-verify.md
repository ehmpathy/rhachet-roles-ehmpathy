# rule.require.trust-but-verify

## .what

verify inherited claims before you act on them.

## .why

claims drift from reality:
- compaction summaries preserve stale conclusions
- prior sessions may have misdiagnosed
- world state changes between sessions
- your own memory is a summary too

action on wrong claims wastes time:
- the orphan processes incident: 20+ commits, 3+ hours, wrong root cause
- actual fix was one file deletion
- prior session had concluded "orphan processes are the issue"
- mechanic never verified — just trusted the summary

verification upfront prevents the retry spiral.

## .the rule

inherited claims that may be stale:

| claim type | example |
|------------|---------|
| diagnoses | "X is the problem" |
| assumptions | "Y is true" |
| objectives | "we need to do Z" |
| observations | "file contains W" |
| conclusions | "the fix is V" |

verify each before you act on it.

## .pattern

```
claim → verify → act
```

1. inherit claim from summary, memory, or prior session
2. verify claim against current state
3. act only after verification

## .antipattern

```
claim → act
```

the orphan processes story:
- summary said "CI fails because orphan processes"
- mechanic acted on claim without verification
- 20+ commits attempted to fix orphan processes
- actual problem: obsolete snapshot file
- one deletion fixed it

## .mantra

> trust but verify; trust none blindly, especially not yourself. always verify.

> question all, question always.

## .enforcement

- action on unverified inherited claim = blocker
- inherited diagnosis without verification = blocker
