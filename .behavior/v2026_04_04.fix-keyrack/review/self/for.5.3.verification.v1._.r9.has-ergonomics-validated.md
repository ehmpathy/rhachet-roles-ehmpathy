# self-review: has-ergonomics-validated (r9)

## question: does the actual input/output match what felt right at repros?

### repros status

no `3.2.distill.repros.experience.*.md` files exist (documented in r5).

ergonomics were driven directly from:
- `1.vision.md` — contract examples and expected outputs
- `2.1.criteria.blackbox.md` — usecase definitions

### validation: before vs after output format

#### vision.md "before" output (line 7-13)

```
🚫 webfetch blocked: border guard not configured

the XAI_API_KEY environment variable is required to enable webfetch.
please ask the human to add XAI_API_KEY to their environment...
```

#### vision.md "after" output (line 22-27)

```
🔐 XAI_API_KEY locked

run: rhx keyrack unlock --owner ehmpath --env prep
```

#### actual implementation (guardBorder.onWebfetch.ts lines 36-39)

```typescript
if (keyGrant.attempt.status !== 'granted') {
  console.error(keyGrant.emit.stdout);  // keyrack's output with unlock instructions
  process.exit(2);
}
```

**verification:** the implementation uses `keyGrant.emit.stdout` which is keyrack SDK's built-in message. keyrack emits unlock instructions in this format. this matches the vision's "after" pattern — actionable instructions with the unlock command.

### validation: SDK contract

#### vision.md contract (lines 46-55)

```typescript
// guardBorder.onWebfetch.ts
import { keyrack } from 'rhachet/keyrack';

const xaiKey = await keyrack.get({
  key: 'XAI_API_KEY',
  owner: 'ehmpath',
  env: 'prep'
});
```

#### actual implementation (lines 2, 29-33)

```typescript
import { keyrack } from 'rhachet/keyrack';

const keyGrant = await keyrack.get({
  for: { key: 'XAI_API_KEY' },
  owner: 'ehmpath',
  env: 'prep',
});
```

#### line-by-line comparison

| aspect | vision.md | implementation | match |
|--------|-----------|----------------|-------|
| import path | `rhachet/keyrack` | `rhachet/keyrack` | exact |
| key param | `key: 'XAI_API_KEY'` | `for: { key: 'XAI_API_KEY' }` | SDK detail |
| owner | `'ehmpath'` | `'ehmpath'` | exact |
| env | `'prep'` | `'prep'` | exact |

**SDK detail noted:** actual SDK uses `for: { key: ... }` wrapper. this is the actual SDK signature, not an ergonomics change. the vision showed conceptual usage.

### validation: timeline flow

vision.md timeline (lines 73-76):
```
1. mechanic attempts WebFetch
2. border guard calls `keyrack.get({ key: 'XAI_API_KEY', ... })`
3. if locked: emit unlock instructions, exit 2
4. if unlocked: proceed with content inspection
```

implementation flow (lines 28-76):
```
1. keyrack.get() called at line 29-33
2. if not granted: emit stdout and exit 2 (lines 36-39)
3. set process.env.XAI_API_KEY (line 42)
4. proceed with decideIsContentAdmissibleOnWebfetch (line 59)
```

**match:** implementation follows vision timeline exactly.

### validation: test assertion alignment

case7 in `blackbox/guardBorder.onWebfetch.acceptance.test.ts` (lines 317-320) was updated in this behavior to align with keyrack output:

```typescript
then('stderr instructs agent how to unlock XAI_API_KEY', () => {
  expect(res.result.stderr).toContain('XAI_API_KEY');
  expect(res.result.stderr).toContain('keyrack unlock');
});
```

this matches vision's "after" output which contains `keyrack unlock`.

### conclusion

**why it holds:**

1. **output format matches vision "after":** implementation uses keyrack's emit.stdout which contains actionable unlock instructions
2. **SDK contract matches vision:** import path, owner, env all exact; `for:` wrapper is SDK detail
3. **timeline flow matches vision:** 4-step flow implemented exactly
4. **test assertions updated:** case7 now expects "keyrack unlock" per vision "after"

**no ergonomics drift detected.** implementation follows vision.md spec.

