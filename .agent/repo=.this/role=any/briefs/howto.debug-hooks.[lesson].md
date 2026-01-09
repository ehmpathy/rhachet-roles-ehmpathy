# howto: debug Claude Code hooks

## .what

techniques to diagnose hook execution issues

## .approach

### 1. check debug logs

use the show.claude.debug skill:

```sh
npx rhachet run --skill show.claude.debug --filter "hook" --tail 50
npx rhachet run --skill show.claude.debug --filter "PreToolUse" --tail 50
```

or directly:

```sh
grep -i "hook" ~/.claude/debug/latest | tail -50
```

key log patterns to look for:
- `executePreToolHooks called for tool: Write` - hook is being triggered
- `Matched N unique hooks` - hooks are registered
- `Hook output does not start with {` - hook returned plain text (expected for blocking)

### 2. capture stdin

add debug output to capture what the hook receives:

```bash
# at the start of your hook, after reading stdin
STDIN_INPUT=$(cat)

# capture stdin for analysis
TS=$(date +%s)
echo "$STDIN_INPUT" > /tmp/my-hook-stdin-$TS.json
```

then check what was received:

```sh
cat /tmp/my-hook-stdin-*.json | jq .
```

### 3. log execution path

add debug lines at key decision points:

```bash
# after reading stdin
echo "DEBUG: received input, length=${#STDIN_INPUT}" >> /tmp/my-hook-debug.log

# after extracting values
echo "DEBUG: TOOL_NAME=$TOOL_NAME" >> /tmp/my-hook-debug.log
echo "DEBUG: CONTENT length=${#CONTENT}" >> /tmp/my-hook-debug.log

# at decision points
echo "DEBUG: condition matched, will block" >> /tmp/my-hook-debug.log

# before exit
echo "DEBUG: exiting with code 2" >> /tmp/my-hook-debug.log
```

### 4. test hook directly

test the hook with captured stdin:

```sh
# run hook directly with captured input
cat /tmp/my-hook-stdin-*.json | ./path/to/hook.sh 2>&1
echo "exit code: $?"
```

### 5. test via rhachet

if hook runs through rhachet, test that path:

```sh
printf '{"tool_name":"Write","tool_input":{"file_path":"test.md","content":"test"}}' | \
  ./node_modules/.bin/rhachet run --repo ehmpathy --role mechanic --init claude.hooks/my-hook 2>&1
echo "exit code: $?"
```

## .common issues

### hook does not block

1. **wrong exit code** - must be exactly `exit 2` (not 1, not other non-zero)
2. **output to stdout instead of stderr** - use `>&2`
3. **within retry window** - HARDNUDGE allows retries
4. **hook crashes before exit** - add debug output
5. **wrapper converts exit code** - see "exit code not propagated" below

### hook does not run

1. **not registered** - check `.claude/settings.json` hooks section
2. **wrong matcher** - ensure matcher matches tool name exactly
3. **hook file not executable** - `chmod +x hook.sh`
4. **rhachet path issue** - check hook resolves correctly

### exit code not propagated

this is the trickiest issue. symptoms:
- hook runs and outputs block message
- debug logs show "Hook output does not start with {" (expected, not an error)
- but the operation still proceeds

**root cause**: Claude Code has specific exit code semantics:

| exit code | Claude Code behavior |
|-----------|---------------------|
| 0 | allow operation |
| 2 | **block operation** (show stderr to user) |
| other | non-block error (log and proceed) |

if a wrapper (like rhachet) converts exit 2 → exit 1, Claude Code treats it as a non-block error and proceeds anyway.

**diagnosis steps**:

```sh
# 1. test hook directly (bypass rhachet)
printf '{"tool_name":"Write",...}' | bash ./path/to/hook.sh 2>/tmp/err.txt
echo "direct exit: $?"

# 2. test through rhachet
printf '{"tool_name":"Write",...}' | ./node_modules/.bin/rhachet run --init claude.hooks/my-hook 2>/tmp/err.txt
echo "rhachet exit: $?"

# 3. compare exit codes
# if direct=2 but rhachet=1, the wrapper is the problem
```

**fix**: ensure rhachet (or any wrapper) propagates the original exit code, not a normalized value

---

## .case study: the exit code 2 mystery

### symptoms observed

1. hook test suite passed (14/14 tests)
2. manual test via `bash hook.sh` showed correct block message and exit 2
3. debug logs showed hooks matched and ran
4. debug logs showed "Hook output does not start with {" (red herring - this is normal)
5. yet Write operations still succeeded

### investigation path

1. **checked hook registration** - hooks present in settings.json ✓
2. **checked debug logs** - "Matched 2 unique hooks for query Write" ✓
3. **added debug output to hook** - confirmed hook reached `exit 2` ✓
4. **tested hook directly** - `bash hook.sh` returned exit 2 ✓
5. **tested through rhachet** - returned exit 0 or 1 ✗

### root cause

rhachet caught the non-zero exit and threw an error, then the error handler did `process.exit(1)` instead of `process.exit(2)`.

Claude Code saw exit 1, treated it as "non-block error", logged it, and proceeded with the Write.

### fix

rhachet was updated to propagate the original exit code:
```js
// before
process.exit(1);

// after
process.exit(result.status ?? 1);
```

### lesson

when hooks run but do not block, compare exit codes at each layer:
1. hook executable directly
2. through any wrapper (rhachet, etc)
3. what Claude Code receives

the gap reveals where exit codes get lost

## .nudge file inspection

check what attempts have been recorded:

```sh
cat .claude/my-hook.nudges.local.json | jq .
```

clear nudge file to reset retry window:

```sh
echo '{}' > .claude/my-hook.nudges.local.json
```

## .see also

- howto.block-writes-via-hooks.[lesson].md
