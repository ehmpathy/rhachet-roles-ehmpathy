# self-review r3: has-questioned-questions (final)

## what changed

reviewed the vision's "open questions & assumptions" section. all questions now marked [answered] with clear resolutions.

## issues found and fixed

### issue 1: `--filter` was generic

**before:** vision proposed `--filter` as the new flag name

**problem:** `--filter` doesn't pair well with `--scope`:
- `--scope` = file path filter (but "scope" sounds like it could be test scope too)
- `--filter` = test name filter (but "filter" could mean many things)

**fix:** renamed to `--name`:
- `--scope` = where (which files)
- `--name` = what (which tests by name)

this pair is explicit. no ambiguity.

### issue 2: deprecation question was open

**before:** vision asked "should we block immediately or deprecate?"

**investigation:** grepped CI configs for `testNamePattern` usage. no matches.

**fix:** answered as [immediate block] with evidence. updated vision to reflect this decision.

### issue 3: questions section was unclear

**before:** questions listed without status markers

**fix:** converted to table with explicit [answered] status and resolutions. shows at a glance that all questions are resolved.

## why the holds hold

### `--name` pairs well with `--scope`

holds because:
- explicit semantics: where vs what
- no ambiguity: `--name` clearly means test name, not file name
- jest precedent: maps 1:1 to `--testNamePattern`

### immediate block is safe

holds because:
- verified via grep: no CI configs use `-- --testNamePattern`
- small user base: internal tool, easy to communicate change
- clear guidance: blocked message tells user exactly what to do

### raw args for non-filter flags should still work

holds because:
- wish specifically targets `--testNamePattern` pattern
- other jest flags (`--verbose`, `--coverage`) have legitimate uses
- no reason to over-restrict

## summary

| item | status |
|------|--------|
| `--filter` → `--name` | fixed (name ambiguity) |
| block vs deprecate | answered (immediate block, no CI usage) |
| questions section | fixed (clear table format) |
| all assumptions | hold with evidence |
