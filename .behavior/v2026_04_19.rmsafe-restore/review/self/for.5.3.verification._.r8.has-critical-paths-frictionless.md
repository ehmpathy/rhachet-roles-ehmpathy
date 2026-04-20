# self-review: has-critical-paths-frictionless (r8)

## I examined the test assertions for user experience

### critical path: user deletes file accidentally

scenario: user runs `rhx rmsafe ./important.txt` by mistake

**what happens:**
1. file is copied to `.agent/.cache/.../trash/important.txt`
2. file is removed from original location
3. output shows coconut hint with restore command

**test assertion (from [case13.t0]):**
```typescript
expect(result.stdout).toContain('🥥 did you know?');
expect(result.stdout).toContain('you can restore from trash');
expect(result.stdout).toContain('rhx cpsafe');
```

**why frictionless:**
- user sees restore command immediately
- no need to remember trash path
- command is exact (not a template)

### critical path: user wants to restore

scenario: user copies command from output

**from snapshot:**
```
└─ rhx cpsafe .agent/.cache/.../trash/build/a.tmp ./build/a.tmp
```

**why frictionless:**
- full source path provided
- full destination path provided
- command uses standard `rhx cpsafe` skill
- no manual path edit required

### edge case: multiple files deleted

**from test [case11.t0] snapshot:**
the coconut hint shows the first file path:
```
└─ rhx cpsafe .agent/.cache/.../trash/build/a.tmp ./build/a.tmp
```

**potential friction:** user must modify command for other files
**mitigation:** trash preserves directory structure, so user can:
- adjust path in shown command
- or browse trash directory directly

**is this acceptable friction?** yes - one example is sufficient.
all paths would clutter output for large globs.

### user mental model check

| user expectation | met? |
|------------------|------|
| deleted file recoverable | yes |
| obvious how to restore | yes |
| one command to restore | yes |
| trash location clear | yes |

## conclusion

critical paths are frictionless. test assertions verify user experience.
