# lesson: SessionStart hooks allow slow startup

## .what

SessionStart hooks have a **60s default timeout**, which easily accommodates rhachet's 5-6s startup overhead. PreToolUse hooks typically use a 5s timeout, which rhachet exceeds.

this is not mysterious behavior — it's just timeout configuration.

## .why they differ

| hook type | typical timeout | rhachet startup | result |
|-----------|-----------------|-----------------|--------|
| SessionStart | 60s | 5-6s | ✅ completes |
| PreToolUse | 5s | 5-6s | ❌ killed |

### SessionStart hooks

- configured with `timeout: 60` (60 seconds)
- rhachet's 5-6s startup is well under this limit
- hooks complete successfully

### PreToolUse hooks

- often configured with `timeout: 5` (5 seconds)
- rhachet's 5.6-6.4s startup exceeds this limit
- hooks are killed before producing output

## .evidence

### SessionStart via rhachet works

the session startup message shows successful boot:

```
SessionStart:compact hook success: <stats>
quant
  ├── files = 98
  │   ├── briefs = 90
  │   └── skills = 7
  ├── chars = 178400
  └── tokens ≈ 44600 ($0.13 at $3/mil)
</stats>
```

this was loaded via:

```json
{
  "command": "./node_modules/.bin/rhachet roles boot --repo ehmpathy --role mechanic",
  "timeout": 60
}
```

rhachet's 5-6s startup is well under the 60s timeout.

### PreToolUse via rhachet fails

PreToolUse hooks configured with `timeout: 5` are killed because rhachet takes 5.6-6.4s to start (see `speed.requirements.pretooluse.[lesson].md`).

## .the fix

### option 1: use direct paths for PreToolUse (recommended)

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

direct scripts complete in ~174ms — well under any reasonable timeout.

### option 2: increase PreToolUse timeout

```json
{
  "PreToolUse": [
    {
      "matcher": "Bash",
      "hooks": [
        {
          "type": "command",
          "command": "./node_modules/.bin/rhachet roles init --repo ehmpathy --role mechanic --command claude.hooks/pretooluse.forbid-stderr-redirect",
          "timeout": 10
        }
      ]
    }
  ]
}
```

this would work, but adds 5-6s latency to every tool call — not recommended.

## .key takeaways

1. **it's just timeout configuration** — no mysterious internal behavior
2. **SessionStart: 60s timeout** — rhachet's 5-6s fits easily
3. **PreToolUse: 5s timeout** — rhachet's 5.6-6.4s exceeds it
4. **solution: fast hooks or longer timeouts** — fast hooks are better

## .related

- `speed.requirements.pretooluse.[lesson].md` — why PreToolUse hooks fail with rhachet
- `speed.requirements.[research].md` — web research confirming documented behavior
