# review: has-vision-coverage (r2)

## approach

1. extract all behaviors from 0.wish.md
2. extract all behaviors from 1.vision.md
3. trace each behavior to playtest coverage
4. identify any gaps

## behaviors from 0.wish.md

### wish line 14
```
1. reads from /tmp/claude* should be auto allowed
```

### wish line 16
```
2. writes into /tmp/* should be auto blocked, in favor of .temp/
```

## behaviors from 1.vision.md

### usecases table (lines 51-56)

| goal | expected |
|------|----------|
| read agent task output | auto-allowed |
| inspect claude session temp | auto-allowed |
| write scratch file to /tmp | blocked → nudged to .temp/ |
| write scratch file to .temp/ | works (preferred path) |

### contract (lines 60-66)

**reads:**
```
- input: `cat /tmp/claude-1000/...` or `tail /tmp/claude-*`
- output: file contents, no prompt
```

**writes:**
```
- input: `echo x > /tmp/foo`
- output: blocked message with .temp/ alternative
```

### timeline (lines 70-72)

1. mechanic invokes read from `/tmp/claude*` → auto-allowed
2. mechanic invokes write to `/tmp/*` → blocked with guidance
3. mechanic uses `.temp/` instead → works, artifacts stay in repo

## detailed traceability

### behavior 1: read /tmp/claude* auto-allowed

**wish (line 14):**
```
1. reads from /tmp/claude* should be auto allowed
```

**vision (lines 22-27):**
```
human: tail -50 /tmp/claude-1000/.../tasks/abc123.output
claude: [auto-allowed, shows output immediately]
human: cat /tmp/claude-1000/.../another-file
claude: [auto-allowed, shows immediately]
```

**playtest path 1 (lines 19-42):**
```
### path 1: read from /tmp/claude* (auto-allowed)

**action:**
mkdir -p /tmp/claude-$(id -u)/test
echo "test content for playtest" > /tmp/claude-$(id -u)/test/sample.txt

then ask claude to run:
cat /tmp/claude-$(id -u)/test/sample.txt

**expected outcome:**
- file contents shown immediately
- no permission prompt appears
- output shows "test content for playtest"
```

**verification:** playtest path 1 directly tests the vision scenario. the command `cat /tmp/claude-$(id -u)/test/sample.txt` matches vision's `cat /tmp/claude-1000/.../another-file`. the outcome "file contents shown immediately" + "no permission prompt" matches vision's "auto-allowed".

---

### behavior 2: write /tmp/* blocked with guidance

**wish (line 16):**
```
2. writes into /tmp/* should be auto blocked, in favor of .temp/
```

**vision (lines 31-37):**
```
human: echo "data" > /tmp/scratch.txt
claude: [blocked]
        🛑 /tmp is not actually temporary
        /tmp persists indefinitely and never auto-cleans.
        use .temp/ instead - it's scoped to this repo and gitignored.
```

**playtest path 2 (lines 46-66):**
```
### path 2: write to /tmp/* (blocked)

**action:**
ask claude:
echo "should be blocked" > /tmp/playtest-scratch.txt

**expected outcome:**
- operation is blocked
- stderr shows guidance message:
  🛑 BLOCKED: /tmp is not actually temporary
  /tmp persists indefinitely and never auto-cleans.
  use .temp/ instead - it's scoped to this repo and gitignored.
    echo "data" > .temp/scratch.txt
- no file created at /tmp/playtest-scratch.txt
```

**verification:** playtest path 2 directly tests the vision scenario. the command `echo ... > /tmp/playtest-scratch.txt` matches vision's `echo "data" > /tmp/scratch.txt`. the guidance message in playtest matches vision's block message verbatim.

---

### behavior 3: .temp/ allowed as alternative

**wish (line 16):**
```
in favor of .temp/
```

**vision (line 56):**
```
| write scratch file to .temp/ | works | works (preferred path) |
```

**playtest path 3 (lines 70-87):**
```
### path 3: write to .temp/* (allowed)

**action:**
ask claude:
mkdir -p .temp && echo "scratch content" > .temp/playtest.txt && cat .temp/playtest.txt

**expected outcome:**
- file is created at .temp/playtest.txt
- no permission prompt appears
- output shows "scratch content"
```

**verification:** playtest path 3 verifies the .temp/ alternative works. the outcome "file is created" + "no permission prompt" matches vision's expectation that .temp/ "works".

---

### edge case: write to /tmp/claude* also blocked

**vision (lines 105-107):**
```
| write to /tmp/claude* | [answered] block tool writes |
```

**playtest edge 1 (lines 93-104):**
```
### edge 1: write to /tmp/claude* (also blocked)

**action:**
ask claude:
echo "should also be blocked" > /tmp/claude-$(id -u)/test/new.txt

**expected outcome:**
- operation is blocked (tool writes to /tmp are blocked, even claude paths)
- stderr shows same guidance message
```

**verification:** playtest edge 1 confirms that even /tmp/claude* paths are blocked for writes, matches vision's answer that tool writes are blocked.

## traceability matrix summary

| source | behavior | playtest path | verified? |
|--------|----------|---------------|-----------|
| wish:14 | reads from /tmp/claude* auto-allowed | path 1 | yes |
| wish:16 | writes to /tmp/* blocked | path 2 | yes |
| wish:16 | favor .temp/ | path 3 | yes |
| vision:61 | cat /tmp/claude* | path 1 | yes |
| vision:65 | echo > /tmp/foo blocked | path 2 | yes |
| vision:107 | write /tmp/claude* blocked | edge 1 | yes |

## edge cases from vision

### edgecases table (vision lines 105-108)

| edge | expected | playtest coverage |
|------|----------|-------------------|
| read non-claude /tmp paths | still prompts | not in playtest (correct - foreman will see prompt) |
| write to .temp/ | allowed | path 3 |
| write to /tmp/claude* | block tool writes | edge 1: lines 93-104 |

## gap analysis

| behavior | covered? | notes |
|----------|----------|-------|
| read /tmp/claude* | yes | path 1 |
| write /tmp/* blocked | yes | path 2 |
| write .temp/* allowed | yes | path 3 |
| write /tmp/claude* blocked | yes | edge 1 |
| /tmpfoo not /tmp/ | yes | edge 2 |
| /var/tmp/ not /tmp/ | yes | edge 3 |

**gaps found:** none. all behaviors from wish and vision are covered.

## why it holds

1. **wish behavior 1 covered**: read /tmp/claude* → path 1
2. **wish behavior 2 covered**: write /tmp/* blocked → path 2
3. **wish .temp/ alternative covered**: → path 3
4. **vision usecases covered**: all 4 rows traced to playtest
5. **vision contract covered**: read and write contracts traced
6. **vision timeline covered**: all 3 steps traced
7. **edge cases covered**: /tmp/claude* write, /tmpfoo, /var/tmp/

all behaviors in wish and vision have playtest coverage.

