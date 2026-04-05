# review r1: has-research-traceability

i have read both research documents and the blueprint line by line. here is my trace.

## research: prod code patterns (3.1.3.research.internal.product.code.prod._.v1.i1.md)

### pattern.1: keyrack CLI in shell — [REUSE]

**research said:** reuse the pattern from keyrack.operations.sh for shell-based keyrack access.

**blueprint says:** keyrack.operations.sh marked as `[~] update` to rename token. the CLI pattern is retained, not replaced.

**trace:** complete. CLI pattern preserved.

### pattern.2: token references — [EXTEND]

**research said:** rename `EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN` → `EHMPATHY_SEATURTLE_GITHUB_TOKEN`.

**blueprint says:** "rename scope" section lists all 43 files. filediff tree shows `[~]` for each affected file.

**trace:** complete. every token reference covered.

### pattern.3: hardcoded apikeys.env — [REPLACE]

**research said:** remove hardcoded path sourcing from shell hook.

**blueprint says:** posttooluse.guardBorder.onWebfetch.sh shows `[-] source ~/.config/rhachet/apikeys.env` in codepath tree.

**trace:** complete. hardcoded path removed.

### pattern.4: direct env check — [REPLACE]

**research said:** replace `process.env.XAI_API_KEY` check with keyrack SDK.

**blueprint says:** guardBorder.onWebfetch.ts codepath shows `[-] if (!process.env.XAI_API_KEY)` and `[+] keyrack.get()`.

**trace:** complete. keyrack SDK replaces env check.

### pattern.5: keyrack.yml — [EXTEND]

**research said:** add XAI_API_KEY and rename token.

**blueprint says:** keyrack.yml in filediff with note "add XAI_API_KEY, rename token".

**trace:** complete. both changes specified.

### pattern.6: keyrack init — [EXTEND]

**research said:** rename token and add XAI_API_KEY in REQUIRED_KEYS.

**blueprint says:** keyrack.ehmpath.sh marked `[~]` with note "rename token in REQUIRED_KEYS".

**wait:** XAI_API_KEY not explicitly mentioned for keyrack init.

**fix needed:** blueprint should note adding XAI_API_KEY to REQUIRED_KEYS in keyrack.ehmpath.sh.

## research: test code patterns (3.1.3.research.internal.product.code.test._.v1.i1.md)

### pattern.1: token removal in tests — [EXTEND]

**research said:** update destructure that removes token from env.

**blueprint says:** test files in filediff tree with `[~]` markers.

**trace:** complete.

### pattern.2-5: fixtures, assertions, snapshots — [EXTEND]

**research said:** update all test references.

**blueprint says:** explicit filediffs for test files and note to regenerate snapshots.

**trace:** complete.

## issue found

blueprint omits XAI_API_KEY from keyrack.ehmpath.sh REQUIRED_KEYS update.

## fix applied

updated blueprint to include XAI_API_KEY in keyrack.ehmpath.sh changes:
- add XAI_API_KEY to REQUIRED_KEYS array

## conclusion

after fix, all research recommendations trace to blueprint sections. no silent omissions.

## why this holds

### the review process

1. **opened each research document** — read 3.1.3.research.internal.product.code.prod._.v1.i1.md and 3.1.3.research.internal.product.code.test._.v1.i1.md line by line
2. **extracted each recommendation** — enumerated every [REUSE], [EXTEND], [REPLACE] tag
3. **traced to blueprint** — for each recommendation, found the corresponding section in 3.3.1.blueprint.product.v1.i1.md
4. **found one gap** — XAI_API_KEY was not mentioned for keyrack.ehmpath.sh
5. **fixed the gap** — updated blueprint to include XAI_API_KEY in keyrack.ehmpath.sh changes

### why no silent omissions remain

every research pattern maps to a blueprint action:

| research pattern | blueprint action |
|-----------------|------------------|
| [REUSE] CLI pattern | retained in keyrack.operations.sh |
| [EXTEND] token references | rename scope section (43 files) |
| [REPLACE] apikeys.env | removed from shell hook |
| [REPLACE] env check | keyrack SDK in TypeScript |
| [EXTEND] keyrack.yml | add XAI_API_KEY, rename token |
| [EXTEND] keyrack init | add XAI_API_KEY, rename token (fixed) |
| [EXTEND] test patterns | all test files in filediff |

### lesson

review caught a missing item. the keyrack init needed XAI_API_KEY added to REQUIRED_KEYS, but the blueprint only mentioned the rename. this gap would have caused a bug: keyrack init would not prompt for XAI_API_KEY.

**fix prevents:** user runs keyrack init, XAI_API_KEY is not configured, border guard fails.
