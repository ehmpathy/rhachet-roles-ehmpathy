# degerund: gerund removal verification

## definition

**degerund** = remove gerunds from compressed content.

gerunds are -ing words used as nouns. they violate `rule.forbid.gerunds` and must be replaced with precise alternatives.

## mechanism

1. regex scan for words that end in `-ing`
2. filter out allowed words (thing, string, bring, etc.)
3. if gerunds found, recompress with degerund instruction
4. brain rewrites without gerunds naturally

## pattern

```ts
const gerundPattern = /\b\w+ing\b/gi;
const hasGerunds = gerundPattern.test(content);
if (hasGerunds) {
  // recompress with degerund instruction
}
```

## alternatives table

| gerund | alternatives |
|--------|-------------|
| *ing that means "extant" | extant, found, current, prior |
| *ing that means "in process" | process, processor, processed |
| *ing that means "to handle" | handle, handler |
| *ing that means "to load" | load, loader, loaded |
| *ing that means "active" | run, runner, active |
| *ing that means "awaited" | queued, awaited, unresolved |
| *ing that means "absent" | absent, notFound, lacks |
| *ing that means "fits" | matched, match, fits |

## allowed words

these end in -ing but are not gerunds:

- thing, things
- string, strings
- bring, brings
- ring, rings
- king, kings
- spring, springs
- swing, swings
- cling, clings
- sting, stings
- fling, flings
- sling, slings
- wring, wrings

## integration

degerund runs **always** as the final verify step in condense pipeline:

```
supply → press → verify(restore?) → verify(degerund)
```

no configuration needed — gerund removal is mandatory for style compliance.

## see also

- `rule.forbid.gerunds` — the style rule this enforces
- `brief.condense.ts` — integrates degerund into verify pipeline
