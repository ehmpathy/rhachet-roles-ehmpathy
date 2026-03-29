# self-review round 8: has-critical-paths-frictionless (question the verification)

## objective

question deeper: how do I KNOW the paths are frictionless?

## the skeptical question

I claimed paths are frictionless, but did I actually run them manually?

### limitation: cannot run through Claude Code itself

I cannot run `rhx sedreplace --old '{ identity: x }' ...` through Claude Code and observe the result because:

1. I AM Claude Code — I cannot observe my own permission prompts
2. the hook needs to be registered and active in settings.json
3. the verification would require a human to confirm "no prompt appeared"

### how the test suite verifies frictionless

the integration tests simulate what Claude Code does:

```typescript
// test feeds JSON to hook (simulates Claude Code hook call)
const result = spawnSync('bash', [scriptPath], {
  input: buildStdinJson({ command: "rhx sedreplace --old '{ identity: x }' ..." }),
});

// test verifies hook returns allow decision (frictionless)
expect(result.stdout).toContain('"permissionDecision": "allow"');
expect(result.exitCode).toBe(0);
```

when the hook returns `permissionDecision: allow`:
- Claude Code skips its safety heuristics
- the command runs without a prompt
- user experiences no friction

### what the tests prove

| test case | input | hook output | user experience |
|-----------|-------|-------------|-----------------|
| P1 | `{ }` in args | allow JSON | no prompt |
| P2 | `( )` in args | allow JSON | no prompt |
| P3 | `[ ]` in args | allow JSON | no prompt |
| P4 | `\|` in regex | allow JSON | no prompt |
| P5 | complex pattern | allow JSON | no prompt |
| N1-N10 | operators | empty (pass-through) | normal prompt |

### the chain of trust

1. test verifies hook returns `permissionDecision: allow`
2. Claude Code documentation says `permissionDecision: allow` skips prompts
3. community validated this works ([GitHub Issue #30435](https://github.com/anthropics/claude-code/issues/30435))
4. therefore: user experiences no friction

### what would break frictionlessness?

1. hook not registered in settings.json — would fall through to normal prompt
2. hook returns wrong JSON structure — Claude Code would ignore it
3. Claude Code changes its hook protocol — tests would still pass but runtime would break

risk #3 is mitigated by community validation and snapshot tests that capture exact output.

## why this holds

1. tests simulate Claude Code's hook invocation
2. tests verify hook returns correct allow decision
3. Claude Code documentation confirms allow decision skips prompts
4. the chain of trust is sound

frictionlessness is verified through simulation, not direct observation. this is the best we can do given the limitation that I cannot observe my own permission prompts.
