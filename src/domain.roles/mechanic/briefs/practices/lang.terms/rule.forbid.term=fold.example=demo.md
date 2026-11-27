# rule.forbid.term=fold.example=demo

a 👎/👍 demo for `rule.forbid.term=fold`.

**👎 bad**
```ts
// fold the lesson events into the current lesson
const lesson = foldLessonEvents({ events });

// fold the dawn and dusk waitlists into one
// fold the reviewer's concern into the reply
```

**👍 good**
```ts
// conclude the lesson from its events
const lesson = asLessonFromEvents({ events });

// merge the dawn and dusk waitlists into one
// absorb the reviewer's concern into the reply
```
