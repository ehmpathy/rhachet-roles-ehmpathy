```md
# scope - what this domain document cares about

the domain focuses on scheduling systems for home services, specifically:
- distinguishing between calendar events and appointments
- managing the schedulable time for providers
- handling potential conflicts with external calendars
- ensuring flexibility and accuracy in provider scheduling

---

# claims - what info we have accumulated

### questions
- what term best describes the schedule during which a provider can be booked, factoring in external events?

### assumptions
- a provider’s schedule can be influenced by both internal service appointments and external calendar events.
- internal service appointments may be rescheduled, while external events may not.

### patterns
- separating internal appointments from external calendar events for conflict management is crucial.
- providers need to specify scheduling independently of their external calendar constraints.

### lessons
- effective scheduling systems must account for both reschedulable service appointments and immutable external events.
- tracking reservable time apart from firm appointments could optimize resource utilization and avoid conflicts.
- defining clear distinctions between [reservable], [reservation], [appointable], and [appointment] is crucial for clarity:
  - [reservable]: when a provider is available for reservations, indicating their declared work hours.
  - [reservation]: any commitment of a provider's time, including both internal and external commitments.
  - [appointable]: refers to the reservable times that remain conflict-free after accounting for existing reservations and are available for new appointments.
  - [appointment]: a work appointment with a neighbor through the system.
- the term [availability] has been collapsed into [reservable] to streamline resource management.
- the term [calendarEvent] has been collapsed into [reservation] with the origin marked as external to align with appointment tracking.

---

# domain usecases - what usecases we care about

- usecase.1 = managing provider reservable time
  - .grammar = @[provider]<setReservableHours> -> [reservable] -> {maximize booking opportunities}
  - .verbage = provider manages reservable time to maximize booking opportunities

- usecase.2 = managing appointments without external conflict
  - .grammar = <checkReservable> -> [reservable] -> {avoid conflicts with external events}
  - .verbage = system manages appointments to avoid conflicts with external events

- usecase.3 = defining reservable time for providers
  - .grammar = @[provider]<setReservableHours> -> [reservable] -> {facilitate future reservations}
  - .verbage = provider defines reservable hours to facilitate future reservations

- usecase.4 = committing provider time effectively
  - .grammar = @[provider]<commitToReservation> -> [reservation] -> {ensure clear schedule commitments}
  - .verbage = provider commits to reservation ensuring clear schedule commitments

- usecase.5 = integrating external events into reservations
  - .grammar = @[provider]<pull>[calendar:events] -> [reservation].origin=external -> {unified scheduling management}
  - .verbage = provider pulls calendar events into reservations for unified scheduling management

---

# domain sketch - what domain knowledge we've distilled

### [resource]s
- [reservable]: declared work hours for future reservations
- [reservation]: any committed use of a provider's time, origin internal or external
- [appointable]: reservable times available for new appointments, conflict-free after existing reservations
- [appointment]: scheduled service with a provider

### <mechanism>s
- <checkReservable>: determines potential time slots for booking
- <rescheduleAppointment>: shifts service appointments without impacting external events

### @[actor]s
- @[provider]: the individual or service offering time for appointments
- @[neighbor]: the potential client or customer seeking a service

### @[actor]{driver}s
- @[provider]{+incentive:<<gain>>[reservable]} to maximize bookable time
- @[neighbor]{+incentive:<<gain>>[service]} by finding an available slot

### @[actor]<action>s
- @[provider]<setReservableHours> to declare open time slots
- @[neighbor]<requestAppointment> to book a service time

---

# appendix - any additional notes

a discussion on [reservable] vs. [appointable]:
- [reservable]: represents the provider's workhours that could have reservations.
- [reservation]: encompasses any commitment of a provider's time, whether internal or external.
- [appointable]: refers to the reservable times that remain conflict-free after accounting for existing reservations and are available for new appointments.
- [appointment]: a specific type of reservation made with a neighbor for work purposes.

---

# changelog - what we've changed and why

- v0 = initialized the domain document focusing on provider scheduling and management of internal appointments versus external events.
- v1 = incorporated new resource definitions of reservable, reservation, and appointment to clarify scheduling terms and extracted usecases from lessons.
- v2 = eliminated the term [availability], merging it with [reservable] to simplify and streamline resource management.
- v3 = consolidated [calendarEvent] into [reservation] with origin defined, added relevant usecase for clarity.
- v4 = updated usecase.5 to reflect the revised mechanism for integrating external events as requested by @[caller].
- v5 = added a discussion to the appendix distinguishing between reservable as the general open hours for bookings and available as specific startTimes for possible appointments as requested by @[caller].
- v6 = revised the appendix to redefine [reservable] vs [appointable] based on @[caller]'s input for greater clarity on resource usage and types.
- v7 = updated lessons to include the terms from the appendix for further clarity. 
- v8 = updated domain sketch to reflect the terms from lessons and appendix as per @[caller]'s input.
- v9 = reordered resources in dependency: reservable -> reservation -> appointable -> appointment per @[caller]'s directive.
```
