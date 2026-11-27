# rule.require.pii-quarantine

## .what

hold pii in a quarantine. it may flow in; it flows out only as a domain concept, or raw through a quarantined path that earns each of four marks.

| direction | allowed |
|---|---|
| **in** | inbound contract → the dao that owns it → the storage. the contract layer passes it straight through; the domain never holds it |
| **out, as a concept** | the dao answers the concept a rule needs: a birth date → the consent required (`SELF` · `PARENT`) or an age band · an address → a service zone · a name → a display handle |
| **out, raw** | only through a quarantined path, below |

## .the quarantined path — all four marks

1. **named business need** — the path exists for one stated purpose: *email the parent the waiver link*. no general "get surfer pii"
2. **quarantined** — one directory of communicators (e.g. `src/access/pii/`) alone may read raw pii; it reads only the fields its purpose needs
3. **authorized** — it checks that the actor may read this pii for this purpose, and refuses otherwise with a `ConstraintError`
4. **audited, and direct** — it logs who read which field for which purpose, never the value; it hands the value straight to its one destination (the email provider) and returns no pii to its caller

## .example

```ts
// 👍 the domain sees only the concept
const consentRequired = await daoSurfer.getConsentRequired({ surfer, on: lessonDate }); // 'SELF' | 'PARENT'

// 👍 the quarantined path: one purpose, authorized, audited, direct
await sendParentWaiverLink({ surfer, reservation }, context);
// inside src/access/pii/: authorize → read parent email → audit (no value) → sdkEmail.send → return { sent: true }
```

## .why

- **the blast radius is the spread.** each place pii sits is a place it can leak, and a place a deletion request must reach. the quarantine keeps that set to one storage and a few named paths
- **rules need concepts, not facts.** the consent rule needs `PARENT`, not a birth date
- **the quarantine is structural.** a path outside it cannot read raw pii at all, so no caller can forget a redaction

## .enforcement

- raw pii read outside the quarantine = **blocker**
- a quarantined path that lacks any of the four marks = **blocker**
- a quarantined path that returns raw pii to its caller = **blocker**

## .see also

- `rule.forbid.pii-egress` — the forbid twin, booted as say
- `define.constraint.kind=invariant` — "raw pii never leaves the quarantine" is an invariant; the quarantine is its structural enforcement
- `rule.require.directional-deps` (mechanic) — the access layer the quarantine sits in
