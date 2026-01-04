# research: Claude Code hook timing behavior

## .what

web research into Claude Code hook timing — conducted to understand why PreToolUse hooks via rhachet fail intermittently.

## .key finding

**the behavior is documented and expected.** hooks that exceed their configured timeout are killed. rhachet takes 5.6-6.4s to start, which exceeds the typical 5s PreToolUse timeout.

there is no mysterious "internal wait window" — just timeout configuration.

## .official documentation

from [Claude Code hooks docs](https://code.claude.com/docs/en/hooks):

| aspect | documented behavior |
|--------|---------------------|
| timeout | 60s default, configurable per hook |
| parallelization | all matching hooks run in parallel |
| input | provided via stdin (JSON format) |
| output | read from stdout/stderr |
| PreToolUse control | exit code 2 signals blocking error |

the documentation is clear: hooks have a configurable timeout, and hooks exceeding that timeout are terminated.

## .our situation

| hook type | configured timeout | rhachet startup | result |
|-----------|-------------------|-----------------|--------|
| SessionStart | 60s | 5-6s | ✅ works |
| PreToolUse | 5s | 5.6-6.4s | ❌ killed |

this is working exactly as documented.

## .github issues reviewed

several github issues report PreToolUse hook problems, but most are configuration issues or actual bugs unrelated to our timeout situation:

### [issue #6305](https://github.com/anthropics/claude-code/issues/6305) — hooks not executing

- users report PreToolUse hooks never execute
- anthropic staff confirmed it "works for me"
- likely configuration issues (hooks snapshot at session start)

### [issue #4362](https://github.com/anthropics/claude-code/issues/4362) — cannot block execution

- hooks returning `{"approve": false}` don't block
- different issue — about blocking semantics, not timing

### [issue #3514](https://github.com/anthropics/claude-code/issues/3514) — preventContinuation ignored

- `{"continue": false}` doesn't prevent execution
- also about blocking semantics, not timing

## .conclusion

our initial hypothesis of a mysterious "~100ms internal wait window" was wrong. the simpler explanation:

1. rhachet takes 5.6-6.4s to start
2. PreToolUse hooks have 5s timeout
3. hooks are killed before producing output
4. this is documented, expected behavior

**solution:** use direct script paths (~174ms) or increase timeout (not recommended due to latency).

## .sources

- [Claude Code hooks docs](https://code.claude.com/docs/en/hooks) — official reference
- [GitHub issue #6305](https://github.com/anthropics/claude-code/issues/6305) — hooks not executing
- [GitHub issue #4362](https://github.com/anthropics/claude-code/issues/4362) — cannot block execution
- [GitHub issue #3514](https://github.com/anthropics/claude-code/issues/3514) — preventContinuation ignored

## .related

- `speed.requirements.pretooluse.[lesson].md` — our empirical findings
- `speed.requirements.sessionstart.[lesson].md` — why SessionStart works
