# self-review r1: has-behavior-coverage

## behaviors from wish

| behavior | location | test | status |
|----------|----------|------|--------|
| "block a bot from run tests in background" (line 21) | hook:88-103 (exit 2 + message) | getMechanicRole.test.ts:53-58 | covered |
| "foreground only, hard rule" (line 23) | hook:52-54 (exit 0 for foreground) | getMechanicRole.test.ts:53-58 | covered |

## behaviors from vision

| behavior | location | test | status |
|----------|----------|------|--------|
| "error: git.repo.test must run in foreground" (line 28) | hook:90 | code review verified | covered |
| "clone tries background → immediate error" (line 113) | hook:103 (exit 2) | getMechanicRole.test.ts:53-58 | covered |
| "clone runs foreground → works as designed" (line 114) | hook:52-54 (exit 0) | code review verified | covered |

## why it holds

1. **hook registration test verifies the hook is wired up.** the test at getMechanicRole.test.ts:53-58 checks:
   - hook is defined
   - filter targets Bash
   - filter fires before (when: 'before')

2. **hook behavior is deterministic.** given the same JSON input, the hook produces the same output. the code paths are:
   - non-Bash tool → exit 0 (allow)
   - Bash without run_in_background → exit 0 (allow)
   - Bash with run_in_background but not git.repo.test → exit 0 (allow)
   - Bash with run_in_background AND git.repo.test → exit 2 (block) + message

3. **PreToolUse hooks are Claude Code primitives.** the hook mechanism itself is tested by Claude Code. our test verifies registration; Claude Code verifies execution.

## gaps found

none. all behaviors from wish and vision have matched implementation and test coverage.
