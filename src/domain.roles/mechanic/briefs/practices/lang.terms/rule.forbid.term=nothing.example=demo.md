# rule.forbid.term=nothing.example=demo

a 👎/👍 demo for `rule.forbid.term=nothing`.

**👎 bad**
```ts
// nothing found for this surfer
if (lessons.length === 0) return { lessons };

// the swell report returned nothing
// nothing to sync
```

**👍 good**
```ts
// no lessons found for this surfer
if (lessons.length === 0) return { lessons };

// the swell report is absent for this spot
// the sync queue is empty
```
