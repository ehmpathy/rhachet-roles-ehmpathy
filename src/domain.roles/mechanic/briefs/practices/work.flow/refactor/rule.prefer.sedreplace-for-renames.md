# rule.prefer.sedreplace-for-renames

⚠️ **CRITICAL** — this practice saves massive time and tokens

## .what

use `sedreplace.sh` for bulk find-and-replace across files instead of N individual Edit tool calls

## .why

- **10x-100x fewer tokens** — one tool call vs read+edit each file individually
- **10x faster execution** — single atomic operation vs sequential edits
- plan mode by default = preview before apply
- constrained to git-tracked files = safe by design

a rename that touches 20 files via Edit = ~40 tool calls (read + edit each) = massive token waste

the same rename via sedreplace = 2 tool calls (plan + apply) = minimal tokens

## .when

- rename a variable, function, or type across the codebase
- update an import path referenced in multiple files
- change a constant or config key used in many places
- any scenario where the same string replacement applies to 3+ files

## .how

```sh
# plan first (default) - see what would change
npx rhachet run --skill sedreplace --old "oldName" --new "newName"

# filter to specific file types (recursive)
npx rhachet run --skill sedreplace --old "oldName" --new "newName" --glob "**/*.ts"

# filter to files in a specific directory
npx rhachet run --skill sedreplace --old "oldName" --new "newName" --glob "src/**/*.ts"

# apply changes after review of plan
npx rhachet run --skill sedreplace --old "oldName" --new "newName" --mode apply
```

### glob pattern semantics

the `--glob` option uses shell glob semantics:

| pattern | matches |
|---------|---------|
| `*.ts` | `.ts` files in root directory only |
| `**/*.ts` | all `.ts` files recursively |
| `src/*.ts` | `.ts` files directly in `src/` |
| `src/**/*.ts` | `.ts` files recursively in `src/` |
| `*.{ts,tsx}` | `.ts` and `.tsx` files in root |
| `**/*.{ts,tsx}` | all `.ts` and `.tsx` files recursively |

## .examples

### rename a function

```sh
# rename getUserById -> findUserByUuid across all .ts files
npx rhachet run --skill sedreplace --old "getUserById" --new "findUserByUuid" --glob "**/*.ts" --mode apply
```

### update an import path

```sh
# update import path after file move
npx rhachet run --skill sedreplace --old "from '@/utils/old'" --new "from '@/utils/new'" --mode apply
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
