# rule.forbid.term=store.example=demo

a 👎/👍 demo for `rule.forbid.term=store`.

**👎 bad**
```ts
const store = createSwellStore();
// a storage constraint, in prose: a store constraint
// we store the reservation, then email the surfer
```

**👍 good**
```ts
const swellsInMemory = createSwellsInMemory();
// a storage constraint (unique, check, foreign key)
// we persist the reservation, then email the surfer
```
