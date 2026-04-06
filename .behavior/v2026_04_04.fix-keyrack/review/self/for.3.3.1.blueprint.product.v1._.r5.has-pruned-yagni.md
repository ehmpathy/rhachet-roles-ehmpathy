# review r5: has-pruned-yagni

fifth pass. question every section.

## re-read the blueprint with fresh eyes

read blueprint line by line. for each section: is this the minimum needed?

### summary section

3 bullet points. each maps to a vision requirement. no extras.

**YAGNI?** no.

### filediff tree section

shows ~15 files explicitly + "*.integration.test.ts (7 files)".

**question:** could we omit file-level detail?

**alternative:** "sedreplace handles 43 files for token rename. see rename scope for list."

**analysis:** filediff tree serves two purposes:
1. show what files change (overview)
2. show what changes in each file (detail)

without filediff tree, implementer lacks overview of affected areas.

**YAGNI?** no. serves overview purpose.

### codepath tree section

shows guardBorderOnWebfetch() changes, keyrack.yml changes, shell hook changes.

**question:** is codepath for keyrack.yml needed? it's just one line addition.

**analysis:** keyrack.yml codepath shows:
- the rename (old → new token name)
- the addition (XAI_API_KEY)

this is useful because it shows both changes in one place.

**YAGNI?** no. clarifies scope.

### test coverage section

lists 4 integration tests + 1 snapshot + manual verification.

**question:** do we need to list each test file?

**alternative:** "update all tests that reference the old token name"

**analysis:** explicit list enables:
1. verification that all tests were updated
2. confidence no test was missed

**YAGNI?** no. aids verification.

### manual verification section

"unlock keyrack, verify WebFetch works"

**question:** is manual verification needed in blueprint?

**analysis:** manual verification is how we confirm the feature works end-to-end. automated tests verify rename; manual verification confirms keyrack integration.

**alternative:** could add integration test for keyrack path. but vision did not request new tests.

**YAGNI?** borderline. manual verification is minimum viable proof. a new integration test would be YAGNI.

### contracts section

~10 lines of copy-pasteable TypeScript.

**question:** is this redundant with codepath tree?

**analysis:** codepath tree shows:
```
[+] const xaiKey = await keyrack.get(...)
[+] if locked: emit unlock instructions, exit(2)
[+] if unlocked: set process.env.XAI_API_KEY
```

contracts section shows exact code.

**redundancy:** yes, partial. codepath describes; contracts implements.

**question:** could we remove one?

**analysis:** codepath serves blueprint structure. contracts serves implementation. both serve different readers.

**YAGNI?** no. different purposes.

### rename scope section

lists 10+ files + "*.integration.test.ts (7 files)".

**question:** is detailed file list YAGNI? sedreplace will find files automatically.

**analysis:** file list enables:
1. pre-verification: "does sedreplace find these files?"
2. post-verification: "did sedreplace update all expected files?"

without list, we cannot verify completeness.

**YAGNI?** no. verification aid.

## YAGNI items found

none.

every section serves a distinct purpose:
1. summary → quick overview
2. filediff tree → file-level overview
3. codepath tree → change-level detail
4. test coverage → test verification
5. contracts → implementation guide
6. rename scope → rename verification

## why this holds

the blueprint follows standard format. no custom sections added. no "future flexibility" abstractions. no "while we're here" features.

each section maps to a standard blueprint concern:
- what changes (filediff, codepath)
- how to test (test coverage)
- how to implement (contracts)
- how to verify (manual verification, rename scope)

## lesson

blueprint sections are not YAGNI if they follow standard format. YAGNI applies to:
- custom sections we invented
- abstractions we added
- features beyond requirements

none of those exist in this blueprint.
