# review: behavior-declaration-adherance (r6)

## approach

I went through each changed file in the PR line by line and compared against the behavior's vision, criteria, and blueprint.

## files reviewed

| file | purpose | adherance |
|------|---------|-----------|
| pretooluse.forbid-tmp-writes.sh (113 lines) | hook implementation | matches vision and blueprint exactly |
| pretooluse.forbid-tmp-writes.integration.test.ts (397 lines) | test suite | covers all criteria |
| getMechanicRole.ts (delta) | hook registration | correct matcher and timeout |
| settings.json (delta) | hook config | registered with Write\|Edit\|Bash matcher |

## vision vs implementation

compared `1.vision.stone` against actual implementation.

### vision: auto-allow reads from /tmp/claude*

**vision says:**
> reads from `/tmp/claude*` flow without interruption

**implementation:**
- hook allows all reads (lines 111-112: `exit 0` for non-write Bash)
- Read tool passthrough (lines 36-39: skip if not Write/Edit/Bash)
- permissions in settings.json handle auto-allow via `Bash(cat /tmp/claude:*)`

**adherance**: yes. reads are allowed by hook (exit 0), and permission rules auto-allow claude paths.

### vision: auto-block writes to /tmp/*

**vision says:**
> writes to `/tmp/*` are blocked with an explanation

**implementation:**
- Write/Edit to /tmp/* → blocked (lines 46-58)
- Bash redirect to /tmp/* → blocked (lines 76-78)
- Bash tee to /tmp/* → blocked (lines 81-83)
- Bash cp to /tmp/* → blocked (lines 87-89)
- Bash mv to /tmp/* → blocked (lines 92-94)

**adherance**: yes. all write patterns in vision are blocked.

### vision: guidance message content

**vision says:**
```
🛑 BLOCKED: /tmp is not actually temporary

/tmp persists indefinitely and never auto-cleans.
use .temp/ instead - it's scoped to this repo and gitignored.

  echo "data" > .temp/scratch.txt
```

**implementation (lines 98-107):**
```bash
echo ""
echo "🛑 BLOCKED: /tmp is not actually temporary"
echo ""
echo "/tmp persists indefinitely and never auto-cleans."
echo "use .temp/ instead - it's scoped to this repo and gitignored."
echo ""
echo "  echo \"data\" > .temp/scratch.txt"
echo ""
```

**adherance**: exact match.

### vision: exit codes

**vision says:**
> exit 2 with "use .temp/ instead"

**implementation:**
- lines 57-58: `exit 2` after block message for Write/Edit
- lines 107-108: `exit 2` after block message for Bash

**adherance**: yes. exit 2 used for all blocks.

### blueprint: hook input contract

**blueprint says:**
```json
{
  "tool_name": "Write" | "Edit" | "Bash",
  "tool_input": {
    "file_path": "/tmp/foo.txt",
    "command": "echo data > /tmp/foo.txt"
  }
}
```

**implementation:**
- tool_name extraction (line 34): `jq -r '.tool_name // empty'`
- file_path extraction (line 43): `jq -r '.tool_input.file_path // empty'`
- command extraction (line 65): `jq -r '.tool_input.command // empty'`

**adherance**: yes. all contract fields extracted correctly.

### blueprint: detection patterns

**blueprint says:**
> - output redirect: > /tmp/ or >> /tmp/
> - tee: tee /tmp/ or tee -a /tmp/
> - cp: cp ... /tmp/
> - mv: mv ... /tmp/

**implementation:**
- redirect (line 76): `\>[[:space:]]*/tmp(/|$)` and `\>\>[[:space:]]*/tmp(/|$)`
- tee (line 81): `tee[[:space:]]+-?a?[[:space:]]*/tmp(/|$)` and `tee[[:space:]]*/tmp(/|$)`
- cp (line 87): `cp[[:space:]].*[[:space:]]/tmp(/|$)`
- mv (line 92): `mv[[:space:]].*[[:space:]]/tmp(/|$)`

**adherance**: yes. all patterns implemented.

## why it holds

### no drift from vision

| vision item | implementation | verdict |
|-------------|----------------|---------|
| read from /tmp/claude* without prompt | hook exit 0 for reads; permissions auto-allow | adheres |
| write to /tmp/* blocked | hook exit 2 with patterns | adheres |
| guidance message | line-for-line match | adheres |
| suggest .temp/ alternative | message includes `.temp/` | adheres |

### no deviation from criteria

| criteria usecase | implementation | verdict |
|------------------|----------------|---------|
| usecase.1: claude temp reads | passthrough (exit 0) | adheres |
| usecase.2: non-claude temp reads | passthrough (exit 0), permissions handle | adheres |
| usecase.3: /tmp writes blocked | exit 2 with guidance | adheres |
| usecase.4: .temp/ writes allowed | passthrough (exit 0) | adheres |

### no misinterpretation of blueprint

| blueprint spec | implementation | verdict |
|----------------|----------------|---------|
| hook input contract | jq extraction matches | adheres |
| detection patterns | regex patterns match | adheres |
| exit code semantics | 0 allow, 2 block | adheres |
| guidance message format | stderr with blank lines | adheres |

## conclusion

implementation adheres to behavior declaration. the hook:
1. blocks writes to /tmp/* (Write/Edit/Bash)
2. allows reads from /tmp/* (exit 0)
3. displays the exact guidance message specified in vision
4. uses exit code 2 for blocks
5. extracts all contract fields correctly
6. detects all write patterns specified in blueprint

no drift, deviation, or misinterpretation found.
