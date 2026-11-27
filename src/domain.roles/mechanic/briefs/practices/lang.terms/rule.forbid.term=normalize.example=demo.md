# rule.forbid.term=normalize.example=demo

a 👎/👍 demo for `rule.forbid.term=normalize`.

**👎 bad**
```ts
const normalizePhone = (phone: string) => { ... };
const normalizedEmail = normalize(email);
const data = normalizeInput(rawData);
```

**👍 good**
```ts
const asE164 = (phone: string) => { ... };
const emailLowercased = asLowercase(email);
const data = asTrimmed(rawData);

// or as methods
const phone = input.phone.asE164();
const email = input.email.asLowercase();
```
