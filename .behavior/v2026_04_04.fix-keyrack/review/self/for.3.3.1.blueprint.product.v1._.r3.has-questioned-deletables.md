# review r3: has-questioned-deletables

third pass. fresh eyes. truly question each element.

## the core question

"if we deleted this and had to add it back, would we?"

## feature-by-feature deletion analysis

### 1. keyrack SDK call in guardBorder.onWebfetch.ts

**the question:** must we use keyrack SDK? could we use CLI instead?

**analysis:** human said "if typescript, use sdk". guardBorder.onWebfetch.ts is TypeScript. SDK is the correct choice.

**could we delete the entire feature?** no — the whole wish is about this.

**verdict:** cannot delete.

### 2. unlock instructions

**the question:** do we need custom unlock instructions? could we rely on keyrack SDK's default error?

**analysis:** read the contracts section in blueprint:
```typescript
if (grant.status === 'locked') {
  console.error(`🔐 XAI_API_KEY locked\n\nrun: rhx keyrack unlock --owner ehmpath --env prep`);
  process.exit(2);
}
```

the keyrack SDK returns a status, but does not emit the unlock command. if we deleted custom instructions, user would see "locked" without any indication what to run.

**verdict:** cannot delete. pit-of-success requires actionable error messages.

### 3. XAI_API_KEY in keyrack.yml

**the question:** must XAI_API_KEY be declared in keyrack.yml?

**analysis:** keyrack requires keys to be declared before they can be filled. without declaration, `keyrack fill` would not prompt for XAI_API_KEY.

**could we skip declaration and use env var directly?** that's what we replace now. the whole point is to use keyrack.

**verdict:** cannot delete.

### 4. token rename (EHMPATHY_SEATURTLE_PROD_GITHUB_TOKEN → EHMPATHY_SEATURTLE_GITHUB_TOKEN)

**the question:** must we rename? could we keep the old name?

**analysis:** human marked this as "hard criteria". explicit requirement.

**why does it matter?** the old name has "_PROD_" but the key lives in env.prep. inconsistency. rename fixes semantic mismatch.

**verdict:** cannot delete. human requirement.

### 5. remove apikeys.env source from shell hook

**the question:** could we keep it as fallback?

**analysis:** vision says "shell wrapper omits credential logic entirely". TypeScript handles credentials via keyrack SDK now.

**what if we kept it?** two paths to credentials = confusion. one path = clarity.

**verdict:** delete it. (this is what the blueprint says — remove the source line)

### 6. keyrack.ehmpath.sh REQUIRED_KEYS update

**the question:** must we update REQUIRED_KEYS? could keyrack init work without it?

**analysis:** keyrack.ehmpath.sh defines which keys keyrack init prompts for. if XAI_API_KEY is not in REQUIRED_KEYS, keyrack init would not prompt for it.

**what happens without it?** human runs keyrack init, XAI_API_KEY is not prompted, border guard fails later with unclear error.

**verdict:** cannot delete. pit-of-success requires all required keys in REQUIRED_KEYS.

## blueprint sections deletion analysis

### filediff tree

**could we merge into a simpler format?** filediff tree is standard blueprint format. clarity > brevity.

**verdict:** keep.

### codepath tree

**could we remove?** codepath tree shows exact changes. without it, implementer must infer from filediff.

**verdict:** keep.

### contracts section

**could we remove?** contracts section shows copy-pasteable SDK usage. without it, implementer must research SDK API.

**verdict:** keep.

### rename scope section

**could we inline into filediff?** 43 files would clutter filediff tree.

**verdict:** keep as separate section.

### test coverage section

**could we remove?** test coverage is required for proof of behavior. cannot skip.

**verdict:** keep.

## deletions summary

| element | delete? | reason |
|---------|---------|--------|
| keyrack SDK call | no | core requirement |
| unlock instructions | no | pit-of-success |
| XAI_API_KEY in yml | no | keyrack requires declaration |
| token rename | no | human requirement |
| remove apikeys.env | yes | this is the planned deletion |
| REQUIRED_KEYS update | no | pit-of-success |
| filediff tree | no | standard format |
| codepath tree | no | clarity |
| contracts section | no | aids implementation |
| rename scope | no | clarity |
| test coverage | no | proof of behavior |

## why this holds

1. **every feature traces to vision or human requirement** — no assumed features
2. **the only deletion is the one we planned** — remove apikeys.env source
3. **blueprint sections are standard format** — not optimizations we added
4. **no premature abstractions** — direct SDK call, no wrapper

## lesson

the blueprint is minimal because the wish was minimal. fix keyrack + rename token = exactly what's in the blueprint. no scope creep detected.
