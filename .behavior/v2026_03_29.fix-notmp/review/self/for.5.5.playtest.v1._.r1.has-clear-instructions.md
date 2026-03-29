# review: has-clear-instructions (r1)

## approach

1. read playtest document line by line
2. identify unclear instructions
3. fix issues found
4. verify each instruction is followable without prior context
5. verify commands are copy-pasteable
6. verify expected outcomes are explicit

## issues found and fixed

### issue 1: prerequisites vague

**before (line 3-7):**
```
## prerequisites

- active branch with hook implementation
- hook registered via `npx rhachet init --hooks --roles mechanic`
- fresh claude code session (to pick up hook changes)
```

**problem:** no numbered steps, no verification step, unclear what "active branch" means

**after:**
```
## prerequisites

1. checkout this branch: `git checkout vlad/fix-notmp`
2. register hooks: `npx rhachet init --hooks --roles mechanic`
3. start fresh claude session: `/chat new` or restart claude code
4. verify hooks loaded: check session start shows `init role repo=ehmpathy/role=mechanic/init=claude.hooks`
```

### issue 2: "ask claude" unclear

**before (line 28-31):**
```
then ask claude:
\`\`\`
cat /tmp/claude-$(id -u)/test/sample.txt
\`\`\`
```

**problem:** unclear if foreman should type this in chat or run via Bash tool

**after:**
```
then type in claude chat (replace 1000 with your uid from `id -u`):
\`\`\`
please read /tmp/claude-1000/test/sample.txt
\`\`\`

or ask claude to run:
\`\`\`
cat /tmp/claude-$(id -u)/test/sample.txt
\`\`\`
```

## line-by-line verification (post-fix)

### prerequisites (lines 3-8)

```
## prerequisites

1. checkout this branch: `git checkout vlad/fix-notmp`
2. register hooks: `npx rhachet init --hooks --roles mechanic`
3. start fresh claude session: `/chat new` or restart claude code
4. verify hooks loaded: check session start shows `init role repo=ehmpathy/role=mechanic/init=claude.hooks`
```

| question | answer |
|----------|--------|
| followable without prior context? | yes — numbered steps, specific commands |
| commands copy-pasteable? | yes — `git checkout`, `npx rhachet init` |
| verification step? | yes — step 4 tells what to check |

### path 1 (lines 19-42)

action (lines 23-37):
```sh
mkdir -p /tmp/claude-$(id -u)/test
echo "test content for playtest" > /tmp/claude-$(id -u)/test/sample.txt
```
then:
```
please read /tmp/claude-1000/test/sample.txt
```
or:
```
cat /tmp/claude-$(id -u)/test/sample.txt
```

outcome (lines 39-42):
```
- file contents shown immediately
- no permission prompt appears
- output shows "test content for playtest"
```

| question | answer |
|----------|--------|
| followable without prior context? | yes — setup commands, then action, then outcome |
| commands copy-pasteable? | yes — both human chat and bash options |
| outcome explicit? | yes — three specific checkable outcomes |

### path 2 (lines 46-66)

action (line 52):
```
echo "should be blocked" > /tmp/playtest-scratch.txt
```

outcome (lines 55-66):
```
- operation is blocked
- stderr shows guidance message:
  🛑 BLOCKED: /tmp is not actually temporary
  /tmp persists indefinitely and never auto-cleans.
  use .temp/ instead - it's scoped to this repo and gitignored.
    echo "data" > .temp/scratch.txt
- no file created at /tmp/playtest-scratch.txt
```

| question | answer |
|----------|--------|
| followable? | yes — single command to try |
| outcome explicit? | yes — exact message quoted, file absence check |

### path 3 (lines 70-87)

action (line 76):
```
mkdir -p .temp && echo "scratch content" > .temp/playtest.txt && cat .temp/playtest.txt
```

outcome (lines 79-82):
```
- file is created at .temp/playtest.txt
- no permission prompt appears
- output shows "scratch content"
```

cleanup (line 86):
```
rm -f .temp/playtest.txt
```

| question | answer |
|----------|--------|
| followable? | yes — compound command, self-verifies with cat |
| cleanup provided? | yes — rm command |

### instruction clarity review (post-fix)

#### path 1: read from /tmp/claude*

| aspect | evaluation |
|--------|------------|
| action clear? | yes — "create test file, then ask claude to cat it" |
| command copy-pasteable? | yes — shell commands are fenced code blocks |
| outcome explicit? | yes — "file contents shown immediately", "no permission prompt" |

### path 2: write to /tmp/*

| aspect | evaluation |
|--------|------------|
| action clear? | yes — "ask claude: echo..." |
| command copy-pasteable? | yes — fenced code block |
| outcome explicit? | yes — "blocked", stderr shows specific message, "no file created" |

### path 3: write to .temp/*

| aspect | evaluation |
|--------|------------|
| action clear? | yes — "ask claude: mkdir && echo && cat" |
| command copy-pasteable? | yes — fenced code block |
| outcome explicit? | yes — "file created", "no prompt", output shows content |
| cleanup included? | yes — rm command provided |

### edge 1: write to /tmp/claude*

| aspect | evaluation |
|--------|------------|
| action clear? | yes — "ask claude: echo..." |
| outcome explicit? | yes — "blocked (tool writes blocked even claude paths)" |

### edge 2: /tmpfoo not /tmp/

| aspect | evaluation |
|--------|------------|
| action clear? | yes — "ask claude: echo..." |
| outcome explicit? | yes — "proceeds to normal permission check" |
| cleanup included? | yes |

### edge 3: /var/tmp/

| aspect | evaluation |
|--------|------------|
| action clear? | yes |
| outcome explicit? | yes — "not blocked, proceeds to normal check" |
| cleanup included? | yes |

## Q: can foreman follow without prior context?

A: yes. the playtest includes:

| element | present? |
|---------|----------|
| prerequisites | yes — branch, hook registration, fresh session |
| sandbox note | yes — all fileops target `.temp/` |
| step-by-step actions | yes — each path has clear action |
| expected outcomes | yes — each path has explicit outcome |
| pass/fail criteria | yes — 4 pass conditions, 5 fail conditions |
| verification checklist | yes — 6 checkboxes |

## Q: are commands copy-pasteable?

A: yes. verified each command block:

| command | copy-pasteable? |
|---------|-----------------|
| `mkdir -p /tmp/claude-$(id -u)/test` | yes — shell expands $(id -u) |
| `echo "test content" > /tmp/claude-.../sample.txt` | yes |
| `cat /tmp/claude-.../sample.txt` | yes |
| `echo "should be blocked" > /tmp/playtest-scratch.txt` | yes |
| `mkdir -p .temp && echo "..." > .temp/playtest.txt && cat ...` | yes |
| `rm -f .temp/playtest.txt` | yes |

## Q: are expected outcomes explicit?

A: yes. each path specifies:

| path | outcome type | specificity |
|------|--------------|-------------|
| path 1 | success | "file contents shown immediately", "no permission prompt" |
| path 2 | block | stderr message quoted verbatim |
| path 3 | success | "file created", "output shows 'scratch content'" |
| edge 1 | block | "blocked, same guidance message" |
| edge 2 | passthrough | "proceeds to normal permission check" |
| edge 3 | passthrough | "not blocked by hook" |

## why it holds

1. **prerequisites listed**: branch, hook registration, fresh session
2. **sandbox noted**: all fileops target .temp/
3. **actions clear**: each path has "ask claude: {command}"
4. **commands copy-pasteable**: all in fenced code blocks
5. **outcomes explicit**: success/block/passthrough with specifics
6. **cleanup provided**: rm commands where needed
7. **pass/fail criteria**: 4 pass, 5 fail conditions
8. **checklist included**: 6 verification steps

instructions are clear and followable by someone without prior context.

