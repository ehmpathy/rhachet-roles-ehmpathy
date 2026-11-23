# F7: new code matches the style of the file it joins

## .the fork
- **a.** new bash operations read one positional `$1`, as every extant operation in `git.repo.test.sh` does; new test fixtures follow the one-fixture shape of `git.repo.test.nice.integration.test.ts`, optional fields included
- **b.** new code adopts named bash args (`test_type="$x"`), splits each fixture into leaf operations, and swaps optional fields for `null`/`[]`, while the rest of the file keeps the old shape

## .taken
**a.** every function in `git.repo.test.sh` takes positional args (`get_scope_file_count "$WHAT" "$local_scope"`, `validate_jest_config "$test_type"`, `output_success "$WHAT" …`). the new operations each take one value, and their names say what it is (`get_jest_config_flag "$test_type"`); one reviewer lane (scope leaks) judged them clear for that reason. a mixed file, half named args and half positional, reads worse than either. the same holds for the test fixtures: the extant `nice` test uses one `runAndCapture` fixture with optional fields (`scope?: string`, `timeout?: string`); the workers test mirrors it so a reader of one reads the other.

## .rework
clean, but it belongs to the whole file: a move to named args or decomposed fixtures should sweep the file in one change, not start in this diff.

## .confidence
80%.

## .where
`git.repo.test.sh` (new `get_*`/`is_*` operations); `git.repo.test.workers.integration.test.ts` and `git.repo.test._.jest-version.integration.test.ts` (fixture setup).

## .verdict
awaits wisher review.
