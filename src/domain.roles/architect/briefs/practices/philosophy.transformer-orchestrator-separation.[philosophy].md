# philosophy.transformer-orchestrator-separation

## .what

orchestrators compose. transformers compute. communicators commute. this separation makes code readable at the call site.

## .the book metaphor

transformers and communicators are **vocabulary** — words with precise definitions.

orchestrators are **sentences** — composed of vocabulary to tell a story.

decode-friction in orchestrators is like **spell out words letter by letter** mid-sentence:

> nobody wants to read "the c-a-t sat on the m-a-t" when they could read "the cat sat on the mat."

### example 1: structured string parse

```ts
// before — requires decode: what's at position 0? what's the format?
org: slug.split('.')[0]!

// after — intent is clear from the name
org: asKeyrackKeyOrg({ slug })
```

### example 2: complicated boolean

```ts
// before — requires trace: what conditions make this true?
const eligible = user.age >= 18 && user.verified && !user.suspended && user.subscription !== 'free';

// after — intent is clear from the name
const eligible = isEligibleForPremiumFeatures({ user });
```

### example 3: multi-step transformeration

```ts
// before — requires simulation: what does this pipeline produce?
const activeUserEmails = users
  .filter(u => u.status === 'active' && u.emailVerified)
  .map(u => u.email.toLowerCase())
  .sort();

// after — intent is clear from the name
const activeUserEmails = getAllActiveUserEmails({ users });
```

## .the compiler metaphor

transformers and communicators are the **instruction set** — atomic, well-defined operations.

orchestrators are **high-level code** — expressive, readable composition.

decode-friction in orchestrators is like **inline assembly** — it breaks the abstraction level and forces readers to context-switch.

## .the insight

> abstraction isn't just about reuse. it's about make code readable at the *call site*.

the orchestrator is where humans and robots spend read-time. every line should tell *what* happens, not *how*.

## .see also

- `define.domain-operation-grains` — the three grains
- `rule.require.orchestrators-as-narrative` — the require rule
- `rule.forbid.decode-friction-in-orchestrators` — the forbid rule
