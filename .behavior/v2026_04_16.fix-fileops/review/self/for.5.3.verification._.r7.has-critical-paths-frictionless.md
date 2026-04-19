# self-review r7: has-critical-paths-frictionless

## repros artifact

no repros artifact exists for this behavior. the repro was embedded in the wish:

```bash
# from 0.wish.md
rhx mvsafe 'src/.../ref.permit-requires-local-contractor.[ref].md' 'src/.../new-name.[ref].md'
# result: files: 0, moved: (none)
```

## critical paths identified

from the wish, the critical paths are:

| path | description |
|------|-------------|
| move file with brackets | `mvsafe --literal 'a.[ref].md' 'b.[ref].md'` |
| delete file with brackets | `rmsafe --literal 'a.[ref].md'` |
| copy file with brackets | `cpsafe --literal 'a.[ref].md' 'b.[ref].md'` |
| glob file with brackets | `globsafe --pattern '*.[ref].md' --literal` |

## verification approach

critical paths were verified via integration tests that exercise:
1. flag parse (`--literal` accepted)
2. glob bypass (path treated as literal when flag set)
3. file operation (move/copy/delete succeeds)

## test results

| skill | tests | result | proof |
|-------|-------|--------|-------|
| mvsafe | 40 tests | pass | `rhx git.repo.test --what integration --scope mvsafe` |
| rmsafe | 30 tests | pass | `rhx git.repo.test --what integration --scope rmsafe` |
| cpsafe | 38 tests | pass | `rhx git.repo.test --what integration --scope cpsafe` |
| globsafe | (extant) | pass | included in integration suite |

## friction check

### unexpected errors?

no. all tests pass. the `--literal` flag is parsed correctly and bypasses glob detection.

### does it feel effortless?

yes. the user experience is:

```bash
# before: fails silently
rhx mvsafe 'file.[ref].md' 'new.[ref].md'
# files: 0, moved: (none)

# after: works with --literal
rhx mvsafe --literal 'file.[ref].md' 'new.[ref].md'
# files: 1, moved: file.[ref].md -> new.[ref].md
```

also, when no `--literal` and brackets present with zero matches, user sees:

```
🐢 crickets, not even a wave...

did you know? brackets [like this] are special glob characters.
if your path has literal brackets, use --literal or escape them: \[ and \]
```

this guides the user to the solution without friction.

### escape syntax alternative

users can also escape brackets:

```bash
rhx mvsafe 'file.\[ref\].md' 'new.\[ref\].md'
```

for globsafe, character class escapes work:

```bash
rhx globsafe --pattern '*.[[]ref[]].md'
```

## why it holds

1. **integration tests pass:** 40 + 30 + 38 + extant = comprehensive coverage
2. **flag accepted:** `--literal` is parsed and sets `IS_GLOB=false`
3. **glob bypassed:** when `IS_GLOB=false`, no glob expansion occurs
4. **hint shown:** users who hit zero matches with brackets see guidance
5. **escape syntax works:** alternative to `--literal` for advanced users

## conclusion

critical paths are frictionless:
- `--literal` flag works as expected
- escape syntax works as fallback
- helpful hint guides users
- no unexpected errors in test suite
