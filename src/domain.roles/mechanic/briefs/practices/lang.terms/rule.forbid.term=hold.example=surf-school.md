# rule.forbid.term=hold.example=surf-school

a 👎/👍 demo for `rule.forbid.term=hold`, one sense per line.

**👎 bad**
```ts
// the lesson is on hold until the instructor confirms
const lesson = { status: 'HELD', heldUntil: slot.startsAt };

// hold the dawn slot for ten minutes while the surfer pays
await daoLessonSlot.hold({ slot, minutes: 10 });

// the cap holds: reserved boards <= stock, per slot
// the shack holds twelve boards
```

**👍 good**
```ts
// the lesson awaits the instructor's confirm
const lesson = { status: 'TENTATIVE', expiresAt: slot.startsAt };

// reserve the dawn slot for ten minutes while the surfer pays
await daoLessonSlot.setReservation({ slot, duration: { minutes: 10 } });

// the cap stays true: reserved boards <= stock, per slot
// the shack contains twelve boards
```

each 👍 line names its sense: a status that says what it awaits, a grip that says what it reserves, a rule that says it is true, a container that says what it contains.
