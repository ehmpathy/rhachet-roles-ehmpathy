# rule.prefer.sedreplace-for-renames

⚠️ **CRITICAL** — this practice saves massive time and tokens

## .what

use `sedreplace.sh` for bulk find-and-replace across files instead of N individual Edit tool calls

## .why

- **10x-100x fewer tokens** — one tool call vs read+edit each file individually
- **10x faster execution** — single atomic operation vs sequential edits
- dry-run by default = preview before apply
- constrained to git-tracked files = safe by design

a rename that touches 20 files via Edit = ~40 tool calls (read + edit each) = massive token waste

the same rename via sedreplace = 2 tool calls (dry-run + execute) = minimal tokens

## .when

- rename a variable, function, or type across the codebase
- update an import path referenced in multiple files
- change a constant or config key used in many places
- any scenario where the same string replacement applies to 3+ files

## .how

```sh
# dry-run first (default) - see what would change
.agent/repo=ehmpathy/role=mechanic/skills/claude.tools/sedreplace.sh \
  --old "oldName" \
  --new "newName"

# filter to specific file types
.agent/repo=ehmpathy/role=mechanic/skills/claude.tools/sedreplace.sh \
  --old "oldName" \
  --new "newName" \
  --glob "*.ts"

# apply changes after review of dry-run
.agent/repo=ehmpathy/role=mechanic/skills/claude.tools/sedreplace.sh \
  --old "oldName" \
  --new "newName" \
  --execute
```

## .examples

### rename a function

```sh
# rename getUserById -> findUserByUuid across all .ts files
sedreplace.sh --old "getUserById" --new "findUserByUuid" --glob "*.ts" --execute
```

### update an import path

```sh
# update import path after file move
sedreplace.sh --old "from '@/utils/old'" --new "from '@/utils/new'" --execute
```

## .antipattern

```ts
// 🚫 don't do this for bulk renames
Edit file1.ts: oldName -> newName
Edit file2.ts: oldName -> newName
Edit file3.ts: oldName -> newName
Edit file4.ts: oldName -> newName
// ... 10 more edits
```

use sedreplace instead for a single atomic operation
