# rule.forbid.term=row.example=demo

a 👎/👍 demo for `rule.forbid.term=row`.

**👎 bad**
```ts
// count the rows of lesson reservations for this surfer
const rowCount = await daoLessonReservation.count({ surfer });

// lock the row, then decrement the board stock
// one row per surfer in the roster table
```

**👍 good**
```ts
// count the lesson reservation records for this surfer
const recordCount = await daoLessonReservation.count({ surfer });

// take a pessimistic lock on the slot record, then decrement the board stock
// one entry per surfer in the roster table
```

a library field that names the unit, such as `result.rowCount` from a postgres client, stays at the boundary: the dao casts it once into `recordCount`.
