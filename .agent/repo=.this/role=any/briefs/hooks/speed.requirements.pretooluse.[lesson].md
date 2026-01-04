# lesson: PreToolUse hooks require fast startup

## .what

PreToolUse hooks must complete within their configured timeout (default 5s). hooks that exceed this timeout are **killed before producing output**, causing them to silently fail.

rhachet CLI indirection adds 5-6+ seconds of startup overhead — which exceeds the typical 5s timeout before the hook even runs. this means rhachet-based PreToolUse hooks are killed by timeout, while direct script invocations complete in ~174ms.

## .why it matters

if you're using PreToolUse hooks for:
- security gates (blocking dangerous commands)
- permission checks
- input validation
- audit logging

...and those hooks exceed their timeout, they will be **killed before producing output** — silently failing to protect you.

this is working as documented: hooks that exceed their timeout are terminated.

## .the discovery

### symptom

two test hooks were configured — one via direct path, one via rhachet:

```json
{
  "hooks": [
    {
      "command": ".agent/.../pretooluse.test-via-direct.sh",
      "timeout": 5
    },
    {
      "command": "./node_modules/.bin/rhachet roles init --repo ehmpathy --role mechanic --command claude.hooks/pretooluse.test-via-rhachet",
      "timeout": 5
    }
  ]
}
```

both hooks log to `.log/hooks/` when invoked. after running several Bash commands:

| hook | invocations logged |
|------|--------------------|
| direct | 5 |
| rhachet | 1 |

the rhachet hook was only invoked **20% of the time**.

### root cause

the hooks are simply too slow. with a 5s timeout and rhachet taking 5.6-6.4s to start, the hooks are killed before they can produce output.

Claude Code debug logs (`~/.claude/debug/*.txt`) showed:

```
2026-01-04T03:24:29.058Z [DEBUG] Matched 4 unique hooks for query "Bash" (4 before deduplication)
2026-01-04T03:24:29.141Z [DEBUG] Hook output does not start with {, treating as plain text
```

**4 hooks matched, but only fast ones (direct paths) produced output** before timeout.

### timeline proof

| timestamp | event | delta |
|-----------|-------|-------|
| 03:24:29.058Z | matched 4 hooks | - |
| 03:24:29.141Z | hook output (1) | +83ms |
| 03:24:31.160Z | next tool call starts | +2.1s |

the direct hook responded in ~83ms. the rhachet hooks were killed by timeout (~5s) before producing output.

more examples from the same session:

```
02:05:31.729Z - matched 4 hooks
02:05:31.783Z - hook output (1) at +54ms  ← direct hook responds fast
02:05:36.582Z - hook output (2) at +4.8s  ← rhachet barely made it (under 5s)
```

```
02:06:32.813Z - matched 4 hooks
02:06:32.840Z - hook output (1) at +27ms  ← direct hook
(rhachet hooks killed by timeout before responding)
```

### why rhachet is slow

the `rhachet roles init` command has startup overhead:
1. spawn node.js process (~500ms)
2. parse CLI arguments
3. load role configuration
4. locate the target script
5. execute the actual hook

total: **2-4 seconds** — far exceeding the ~100ms wait window.

### speedtest confirmation

using `speedtest.hook.sh` to measure 21 iterations with simulated stdin:

**rhachet CLI invocation:**
```
⏱️  speedtest: ./node_modules/.bin/rhachet roles init --repo ehmpathy --role mechanic --command claude.hooks/pretooluse.forbid-stderr-redirect
   runs: 21
   threshold: 5s

📊 results
   ├── min: 5.656s
   ├── max: 6.397s
   ├── avg: 6.114s
   └── p95: 6.397s

❌ UNSAFE for hooks (p95 6.397s > 5s threshold)
```

**direct script path:**
```
⏱️  speedtest: .agent/repo=ehmpathy/role=mechanic/inits/claude.hooks/pretooluse.forbid-stderr-redirect.sh
   runs: 21
   threshold: 5s

📊 results
   ├── min: 104ms
   ├── max: 244ms
   ├── avg: 174ms
   └── p95: 201ms

✅ SAFE for hooks (p95 201ms < 5s threshold)
```

**the difference: 35x faster** — direct paths respond in ~174ms vs rhachet's ~6.1s.

## .the fix

use direct script paths for PreToolUse hooks:

```json
{
  "PreToolUse": [
    {
      "matcher": "Bash",
      "hooks": [
        {
          "type": "command",
          "command": ".agent/repo=ehmpathy/role=mechanic/inits/claude.hooks/pretooluse.forbid-stderr-redirect.sh",
          "timeout": 5
        }
      ]
    }
  ]
}
```

**not:**

```json
{
  "command": "./node_modules/.bin/rhachet roles init --repo ehmpathy --role mechanic --command claude.hooks/pretooluse.forbid-stderr-redirect"
}
```

## .how to detect

### 1. create test hooks that log invocations

```bash
#!/usr/bin/env bash
STDIN_INPUT=$(cat)
echo "=== $(date -Iseconds) ===" >> .log/hooks/invoked.my-hook.log
echo "$STDIN_INPUT" >> .log/hooks/invoked.my-hook.log
exit 0
```

### 2. compare invocation counts

run several tool calls, then:

```bash
grep -c "===" .log/hooks/invoked.*.log
```

if counts differ significantly, slower hooks are being skipped.

### 3. check debug logs

use the `show.claude.debug.sh` skill:

```bash
.agent/repo=.this/role=any/skills/show.claude.debug.sh --filter "Matched.*hooks|Hook output" --tail 50
```

look for mismatches between "Matched N hooks" and subsequent "Hook output" messages.

## .key takeaways

1. **hooks must complete within timeout** — this is documented behavior
2. **rhachet exceeds 5s timeout** — 5.6-6.4s startup means hooks are killed
3. **direct script paths work** — ~174ms avg is well under any reasonable timeout
4. **timeout = total execution time** — includes startup, not just logic
5. **increase timeout or decrease latency** — either fix works, but fast hooks are better

## .related

- `speed.requirements.sessionstart.[lesson].md` — SessionStart hooks don't have this constraint
- `speed.requirements.[research].md` — web research on hook timing behavior
- `.agent/repo=.this/role=any/skills/speedtest.hook.sh` — skill to measure command latency for hook suitability
- `.agent/repo=.this/role=any/skills/show.claude.debug.sh` — skill to view debug logs
- [Claude Code hooks docs](https://code.claude.com/docs/en/hooks)
- [GitHub issue #6305](https://github.com/anthropics/claude-code/issues/6305) — hooks not executing
- [GitHub issue #12100](https://github.com/anthropics/claude-code/issues/12100) — hooks silently skipped
