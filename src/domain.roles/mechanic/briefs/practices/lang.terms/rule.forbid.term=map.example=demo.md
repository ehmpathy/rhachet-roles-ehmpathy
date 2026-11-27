# rule.forbid.term=map.example=demo

a 👎/👍 demo for `rule.forbid.term=map`.

**👎 bad**
```
const userMap = new Map(users.map((u) => [u.uuid, u]));
// map the stripe customer to our customer
## .the map — kind × grain
```

**👍 good**
```
const usersByUuid = new Map(users.map((u) => [u.uuid, u]));
// cast the stripe customer to our customer: asCustomer
## .the dimensions — kind × grain
```

the identifiers `Map` and `.map` stay; the names we choose do not say "map".
