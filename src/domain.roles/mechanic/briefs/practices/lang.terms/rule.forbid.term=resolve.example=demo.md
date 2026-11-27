# rule.forbid.term=resolve.example=demo

a 👎/👍 demo for `rule.forbid.term=resolve`.

**bad**
```ts
const resolveConfig = (input: RawConfig) => { ... };
const resolved = resolve(ref);
const path = resolvePath(relative, base);
```

**good**
```ts
const deriveConfig = (input: RawConfig) => { ... };
const expanded = expand(ref);
const path = expandPath(relative, base);
```
