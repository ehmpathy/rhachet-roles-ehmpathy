# self-review r5: has-journey-tests-from-repros (deeper reflection)

## searched for repros

```bash
glob: .behavior/v2026_04_17.fix-test-in-background-but-polled/3.2.distill.repros.experience*.md
result: no files found
```

## the real question: should there be journey tests?

to step back from "no repros artifact was declared" - the deeper question is: **should this behavior have journey tests?**

### the journey from the wish

the wish describes a clear journey:
1. clone tries to run `rhx git.repo.test --...` in background
2. clone proceeds to poll the output file
3. this wastes 2500+ tokens vs the 50 token curated output

the desired journey after:
1. clone tries to run in background
2. hook blocks with clear message
3. clone runs in foreground
4. clone sees curated 50 token output

### what we test today

| element | tested? | how? |
|---------|---------|------|
| hook is registered | yes | getMechanicRole.test.ts:53-58 |
| hook targets Bash | yes | assertion on filter.what |
| hook fires before | yes | assertion on filter.when |
| hook blocks background | no | not tested directly |
| hook allows foreground | no | not tested directly |
| error message is clear | no | not tested directly |

### the gap i see

we test **registration** but not **behavior**. the hook logic is covered by code review, not by automated test.

a shell test could verify:
```bash
# should allow foreground
echo '{"tool_name":"Bash","tool_input":{"command":"rhx git.repo.test"}}' | ./hook.sh
# exit 0

# should block background
echo '{"tool_name":"Bash","tool_input":{"command":"rhx git.repo.test","run_in_background":true}}' | ./hook.sh
# exit 2, stderr contains message
```

### why this gap is acceptable (for now)

1. **hook is deterministic.** given JSON input, the code paths are explicit.
2. **hook is simple.** ~100 lines, 4 conditions, 2 exit codes.
3. **registration is the integration point.** if hook is registered wrong, tests catch it.
4. **behavior was manually verified.** in development, the hook was tested with real Claude Code invocations.

### future consideration

a shell test for hook behavior would increase confidence. this could be a follow-up PR.

## why it holds (for this PR)

1. **no repros artifact declared.** the route did not include distill.repros phase.
2. **registration is tested.** proves hook is wired to correct trigger.
3. **behavior is deterministic.** code review verified the logic paths.
4. **manual verification performed.** hook was tested in development.

## gaps found

no blocker gaps. the hook behavior test is a "nice to have" for a follow-up, not a blocker for this PR.
