# rule.forbid.term=existing.example=demo

a 👎/👍 demo for `rule.forbid.term=existing`.

**👎 bad**
```ts
// skip the write if an existing reservation is found
const existingReservation = await daoLessonReservation.getOne({ by: { unique } });
```

**👍 good**
```ts
// skip the write if a reservation is found
const reservationFound = await daoLessonReservation.getOne({ by: { unique } });
```

other fits, by sense: `extant` (already exists, in general), `current` (the present instance), `prior` (from before), `present` (here now).
