```md
# 🎯 purpose - what is this document about

distill and clarify terms and use cases where a `@[provider]` manages reservable time, focusing on differentiating between general reservations and specific appointments on a `@[provider]`'s calendar.

---

# 📚 claims - what info we have accumulated

### questions

- how can we differentiate between general reservations and specific appointments within a `@[provider]`'s scheduling system?
- what terms best capture these different use cases without causing confusion?

### assumptions

- reservable time is time that could potentially be claimed on a `@[provider]`'s calendar.
- reservations are claims on reservable time meant to prevent conflicts.
- appointments are reservations with a specific `@[neighbor]`.

### patterns

- there is a need to clearly distinguish between general reservations impacting availability and specific appointments reflecting direct engagements.

### lessons

- ensure that both reservations and specific appointments are clearly communicated and represented within the system to manage external and internal commitments effectively.
- always use the term `@[neighbor]` instead of `@[customer]` to align with the community-focused language and engagement approach.

---

# 💡 concept - what term do we aim to distill

.what =
  - terms and concepts that differentiate general reservations from specific appointments for `@[provider]`.
.why =
  - usecase.1 =
    - .grammar = @[provider]<reserve> -> [reservable] -> {general reason}
    - .verbage = `@[provider]` reserves time due to a general reservation on the calendar
  - usecase.2 =
    - .grammar = @[provider]<set> -> [appointment] -> {with @[neighbor]}
    - .verbage = `@[provider]` sets an appointment directly with `@[neighbor]`

---

## 🔭 candidates

> list terms for distinguishing general reservations and specific appointments

- generalReservation
  .definition = a claim on reservable time for any prevention of conflict
  .example = a `@[provider]` reserves time to review paperwork, ensuring no other appointments are booked
  
- specificAppointment
  .definition = a scheduled engagement or meeting directly managed with a `@[neighbor]`
  .example = a `@[provider]` sets an appointment for a consultation with a `@[neighbor]`

- calendarHold
  .definition = a temporary hold on time to indicate a reservation, not linked to a specific appointment
  .example = a `@[provider]` blocks a time slot for an expected delivery

- neighborEngagement
  .definition = any scheduled interaction or meeting with a `@[neighbor]`
  .example = a `@[provider]` books time to give a service to a `@[neighbor]`

---

## 🔬 evaluations

> assess pros and cons for terms regarding intuition, distinctness, and more

- generalReservation
  - intuitive?
    - clearly implies a time reservation without specifying the purpose
    - matches scenarios for blocking time generally
  - distinct?
    - separates from appointment-specific terms effectively

- specificAppointment
  - intuitive?
    - understood clearly as an engagement with a specific `@[neighbor]`
    - aligns easily with system-managed appointments
  - applicable?
    - very applicable where specific, neighbor-targeted scheduling occurs

- calendarHold
  - intuitive?
    - indicates a temporary block related to general purposes rather than a specific engagement
  - extensive?
    - useful across many similar blocking scenarios not tied directly to service

- neighborEngagement
  - intuitive?
    - effectively represents direct interaction within a service platform
  - extensive?
    - natural fit for broader neighborhood-oriented scenarios

---

## 🏁 choose winner

> declare the current best-fit term for use cases

```ts
{
  name: 'generalReservation',
  role: 'claim on reservable time for general purpose',
  replaces: ['reservation', 'hold'],
  inverse: 'specificAppointment',
  test_case: '<reserve> → <<drop>>[conflict] → [generalReservation]',
  note: 'effectively protects reservable time without detailing the appointment.'
}
```

```ts
{
  name: 'specificAppointment',
  role: 'scheduled meeting with a specific neighbor',
  replaces: ['appointment', 'booking'],
  inverse: 'generalReservation',
  test_case: '<set> → <<gain>>[engagement] → [specificAppointment]',
  note: 'captures specific engagements with `@[neighbor]` and is distinctly understood.'
}
```

✅ sanity check:

- [x] intuitive
- [x] distinct
- [x] collapses synonyms
- [x] reusable in system flows

---

## appendix (optional)

- consider scenarios where general reservations might require conversion into specific appointments, such as when unexpected openings occur and `@[providers]` wish to fill those blocks with direct services to `@[neighbors]`.

---

## changelog

- v0 = initial creation focusing on distinguishing general reservations and specific appointments
- v1 = refined terminology to integrate feedback and focus on neighbor engagement
- v2 = added detailed evaluations for candidate terms
- v3 = defined specific winning terms for clarity and reusability
```