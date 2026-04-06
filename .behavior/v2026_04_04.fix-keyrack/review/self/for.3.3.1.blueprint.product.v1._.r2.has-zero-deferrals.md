# review r2: has-zero-deferrals

second pass review with fresh eyes.

## systematic deferral search

searched blueprint for deferral language:
- "defer" — 0 matches
- "future" — 0 matches
- "out of scope" — 0 matches
- "later" — 0 matches
- "todo" — 0 matches
- "tbd" — 0 matches
- "phase 2" — 0 matches
- "backlog" — 0 matches
- "nice to have" — 0 matches
- "optional" — 0 matches

**result:** no deferral language found.

## vision → blueprint trace (item by item)

### vision item 1: keyrack-powered credential fetch

**vision says:**
> "border guard checks keyrack" for XAI_API_KEY

**blueprint says:**
- codepath tree shows `[+] keyrack.get()` for XAI_API_KEY
- contracts section shows exact SDK usage

**deferred?** no. fully specified.

### vision item 2: unlock instructions on locked state

**vision says:**
> "if locked: emit unlock instructions, exit 2"

**blueprint says:**
- codepath tree shows `[+] if locked: emit unlock instructions, exit(2)`
- contracts section shows exact error message format

**deferred?** no. fully specified.

### vision item 3: XAI_API_KEY in keyrack.yml

**vision says:**
> "XAI_API_KEY in env.prep"

**blueprint says:**
- keyrack.yml codepath shows `[+] XAI_API_KEY`
- filediff tree shows keyrack.yml update

**deferred?** no. fully specified.

### vision item 4: token rename across all files

**vision says:**
> "rename to EHMPATHY_SEATURTLE_GITHUB_TOKEN"

**blueprint says:**
- rename scope section lists 43 files
- sedreplace pattern specified

**deferred?** no. fully specified.

### vision item 5: remove hardcoded apikeys.env

**vision says:**
> "shell wrapper omits credential logic entirely"

**blueprint says:**
- posttooluse.guardBorder.onWebfetch.sh shows `[-] source ~/.config/rhachet/apikeys.env`

**deferred?** no. fully specified.

### vision item 6: keyrack init REQUIRED_KEYS update

**vision says:** (implicit from keyrack pattern)
> keyrack.ehmpath.sh must know about new keys

**blueprint says:**
- filediff tree shows `[~] keyrack.ehmpath.sh` with note "rename token in REQUIRED_KEYS, add XAI_API_KEY"

**deferred?** no. caught and fixed in r1.has-research-traceability review.

## coverage matrix

| vision requirement | blueprint section | status |
|-------------------|-------------------|--------|
| keyrack.get() for XAI_API_KEY | contracts section | covered |
| unlock instructions | codepath tree | covered |
| XAI_API_KEY in keyrack.yml | keyrack.yml codepath | covered |
| token rename (43 files) | rename scope section | covered |
| remove apikeys.env | shell hook filediff | covered |
| REQUIRED_KEYS update | keyrack.ehmpath.sh filediff | covered |

## implicit requirements check

beyond explicit vision items, checked for implicit requirements:

1. **test coverage** — blueprint specifies integration test updates for token rename
2. **snapshot regeneration** — blueprint notes snapshots need regeneration
3. **manual verification** — blueprint includes verification steps

**deferred?** no implicit requirements deferred.

## conclusion

**zero deferrals found.** all vision requirements are covered in the blueprint.

## why this holds

the blueprint is comprehensive because:

1. **filediff tree covers all files** — 43 files for rename + keyrack.yml + TypeScript + shell hook
2. **codepath tree shows exact changes** — `[+]`, `[-]`, `[~]` markers are specific
3. **contracts section shows exact API** — keyrack SDK usage is copy-pasteable
4. **test coverage is specified** — integration tests and snapshots are addressed
5. **rename scope is explicit** — sedreplace pattern and file list are complete

no "future work" markers exist. the blueprint commits to full delivery of the vision.
