# self-review: has-consistent-mechanisms

## mechanisms reviewed

### 1. regex pattern extraction with BASH_REMATCH

**new code:**
```bash
if [[ "$SCOPE" =~ ^path\((.+)\)$ ]]; then
  SCOPE_PATTERN="${BASH_REMATCH[1]}"
```

**extant patterns?** yes - codebase uses this pattern in:
- `pretooluse.forbid-tmp-writes.sh` (line 129, 137)
- `pretooluse.forbid-sedreplace-special-chars.sh` (lines 66, 68, 74, 76)
- `git.commit.set.sh` (line 96)
- `git.repo.get.operations.sh` (lines 33, 34, 39, 40)

**duplicates extant?** no - uses same bash standard pattern, not a new utility

**verdict:** holds - consistent with extant patterns

### 2. REST_ARGS validation loop

**new code:**
```bash
for arg in "${REST_ARGS[@]}"; do
  if [[ "$arg" == "--testNamePattern" ]]; then
    # block
  fi
done
```

**extant patterns?** no similar REST_ARGS validation found elsewhere

**duplicates extant?** no - this is new functionality (block specific args)

**could reuse extant?** no - this is specific to git.repo.test

**verdict:** holds - new functionality, no duplication

### 3. 🥥 coconut tip output

**new code:**
```bash
echo "🥥 did you know?"
echo "   ├─ ..."
```

**extant patterns?** searched for 🥥 - not found elsewhere in codebase

**duplicates extant?** no - this is a new output pattern per user request

**verdict:** holds - new feature, consistent with treestruct output style

## summary

| mechanism | extant similar | duplicates | verdict |
|-----------|----------------|------------|---------|
| BASH_REMATCH regex | yes (many places) | no (standard bash) | holds |
| REST_ARGS validation | no | no | holds |
| 🥥 tip output | no | no (new feature) | holds |

no mechanism duplication found.
