# review r4: has-questioned-assumptions

fourth pass. dig deeper into technical assumptions.

## deeper assumption analysis

### assumption 10: keyrack.get is async

**what we assume:** `await keyrack.get(...)` is valid.

**what if false?** if synchronous, the await would be unnecessary but harmless.

**what if it throws?** the blueprint shows a check for `grant.status === 'locked'`, not a try-catch.

**risk:** if keyrack.get throws on locked state instead of returns { status: 'locked' }, our error path would not execute.

**analysis:** the wish showed this pattern:
```typescript
const xaiKey = await keyrack.get({ key: 'XAI_API_KEY', env: 'prod' });
```
so async is confirmed.

**mitigation:** verify SDK behavior at implementation. if it throws, wrap in try-catch.

### assumption 11: grant.secret contains the actual credential value

**what we assume:** `grant.secret` is a string we can assign to `process.env.XAI_API_KEY`.

**what if false?** if `grant.secret` is an object or function, env assignment would fail.

**evidence:** none explicit. human pattern showed `grant.secret` but did not specify type.

**risk level:** medium. need to verify SDK response shape.

**mitigation:** read SDK docs or source at implementation time.

### assumption 12: guardBorder.onWebfetch.ts runs as main entry

**what we assume:** credential fetch at top of function will execute before any downstream code.

**what if false?** if module is imported elsewhere, init order could be wrong.

**evidence:** shell hook shows `exec node ... guardBorderOnWebfetch()`. this is direct CLI invocation.

**risk level:** low. CLI invocation means predictable entry point.

### assumption 13: test snapshots only need regeneration, not content changes

**what we assume:** after token rename, snapshots regenerate correctly with new token name.

**what if false?** if snapshots contain hardcoded assertions, tests would fail.

**evidence:** research showed snapshots in `__snapshots__/` directories. standard jest snapshot pattern.

**risk level:** low. jest snapshots auto-update with RESNAP=true.

### assumption 14: no other code imports XAI_API_KEY from elsewhere

**what we assume:** only guardBorder.onWebfetch.ts needs XAI_API_KEY.

**what if false?** other code might also need the credential.

**evidence:** research grep for XAI_API_KEY showed only guardBorder and shell hook.

**risk level:** low. verified by research.

### assumption 15: posttooluse.guardBorder.onWebfetch.sh passes env to child

**what we assume:** when shell hook execs node, XAI_API_KEY set by keyrack.get() in TypeScript is not needed by shell.

**what we currently assume:** shell sources apikeys.env, which sets XAI_API_KEY in shell env, then passes to node.

**after change:** shell does not set XAI_API_KEY. TypeScript sets it via keyrack SDK.

**risk:** none. TypeScript sets env var in its own process. does not need shell to pass it.

## new issues found

### issue: SDK error behavior unknown

**problem:** blueprint assumes keyrack.get() returns `{ status: 'locked' }` on locked state. if SDK throws instead, our error path would not work.

**fix needed?** no fix to blueprint needed. implementation should verify SDK behavior and adapt.

**action:** add note to blueprint that SDK behavior should be verified at implementation.

## why this holds

after four passes, assumptions fall into categories:

| category | count | risk |
|----------|-------|------|
| human confirmed | 3 | none |
| documented | 2 | none |
| research verified | 4 | low |
| needs implementation verification | 2 | medium |

the "needs implementation verification" items are:
1. keyrack.get() error behavior (throws vs returns)
2. grant.secret shape (string vs object)

these do not block the blueprint. they inform implementation.

## lesson

the blueprint documents the expected behavior based on available evidence. implementation may need to adapt based on actual SDK behavior. this is normal — blueprints capture intent, implementation handles reality.
