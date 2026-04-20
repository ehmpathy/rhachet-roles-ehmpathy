# self-review: has-consistent-conventions (r4)

## deeper review with fresh eyes

re-read actual code files line by line to find convention issues.

### test case convention

examined: rmsafe.integration.test.ts line 597

```typescript
given('[case13] trash feature', () => {
```

extant pattern: `[case1]` through `[case12]` exist in same file

verdict: `[case13]` follows sequential case index convention

### test structure convention

examined: test file lines 600-745

```typescript
when('[t0] single file deleted', () => {
  then('file extant in trash at mirrored path', () => {
```

extant pattern: given/when/then structure with `[tN]` suffixes

verdict: follows extant given/when/then pattern with `[t0]` through `[t4]`

### constant convention

examined: test file uses `TRASH_REL` constant (defined at top)

```typescript
const TRASH_REL = '.agent/.cache/repo=ehmpathy/role=mechanic/skill=rmsafe/trash';
```

usage: consistent throughout all trash tests

verdict: follows DRY principle for path constant

### comment style convention

examined: rmsafe.sh lines 96-107

```bash
# compute trash directory path
TRASH_DIR="$REPO_ROOT/..."

# findsert trash directory with gitignore
findsert_trash_dir() {
```

extant pattern: `# lowercase comment` before related code block

verdict: follows extant comment style

## conclusion

all conventions verified through line-by-line code review:
- test case index ([case13] follows [case12])
- test structure (given/when/then with [tN])
- constant usage (TRASH_REL)
- comment style (lowercase, before code block)
