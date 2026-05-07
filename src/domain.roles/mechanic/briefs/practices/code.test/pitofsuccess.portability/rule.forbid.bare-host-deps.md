# rule.forbid.bare-host-deps

## .what

tests must never call bare commands that depend on host provisioned binaries or shell functions. tests must provision all deps they need.

## .why

- bare `npm`, `node`, `git` may be shell functions, aliases, or wrong versions
- PATH-injected mocks lose to shell functions (functions outrank PATH)
- host state is invisible, untestable, and varies per machine
- "works on my machine" is the symptom of this defect

## .pattern

### bad — bare host dep

```bash
# skill calls bare `npm` — subject to shell function override
eval "npm run test:unit"

# test mocks only the npm binary — shell function bypasses it
fs.writeFileSync(path.join(fakeBinDir, 'npm'), mockScript);
```

### good — explicit binary path

```bash
# skill locates binary from project deps
"$REPO_ROOT/node_modules/.bin/npm" run test:unit
```

### good — mock all dispatch targets

```typescript
// mock npm AND pnpm (shell function may dispatch to either)
for (const bin of ['npm', 'pnpm']) {
  fs.writeFileSync(path.join(fakeBinDir, bin), mockScript);
  fs.chmodSync(path.join(fakeBinDir, bin), '755');
}
```

## .the rule

| approach | hermetic? |
|----------|-----------|
| `eval "npm run ..."` | no — host shell function may intercept |
| `"$REPO_ROOT/node_modules/.bin/npm" run ...` | yes — explicit path |
| mock only `npm` binary | no — shell function dispatches to `pnpm` |
| mock both `npm` and `pnpm` | yes — covers all dispatch paths |

## .what counts as a bare host dep

any command that:
1. relies on PATH lookup without explicit path
2. assumes host has a specific binary installed
3. assumes a command is a binary (not a shell function)
4. inherits tool config from host (`.npmrc`, `.gitconfig`, etc.)

## .how to provision

| dep | provision method |
|-----|-----------------|
| npm/pnpm | use `$REPO_ROOT/node_modules/.bin/npm` or mock all variants |
| jest | use `$REPO_ROOT/node_modules/.bin/jest` |
| git | acceptable bare (always a binary, never a function) |
| node | acceptable bare (always a binary) |

## .enforcement

- test that calls bare `npm`/`pnpm`/`yarn` without mock = blocker
- mock that covers only one package manager name = blocker

## .see also

- `rule.require.hermetic-tests` — tests must not depend on host env
- `howto.mock-cli-via-path` — PATH injection pattern (with caveats)
