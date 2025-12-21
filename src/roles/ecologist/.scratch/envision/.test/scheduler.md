```md
# summary

.what =
  - Define [reservable] work hours for a home-service provider using mechanisms like <setReservable>.
  - Manage and process [reservation] instances which utilize the defined [reservable] hours.
  - Create [appointable] resources derived from [reservable] minus [reservation], representing the available options for new appointments.
  - Integrate both internal and external calendar data to handle [reservation].origin dynamics.
  - Facilitate appointments as [reservation].origin=internal between a @[provider] and a @[neighbor].

.why =
  - To efficiently coordinate appointments and prevent booking conflicts.
  - To provide a streamlined method for providers to manage their availability.
  - To ensure seamless integration with existing calendar systems.

.when =
  - When a provider wants to update their work availability.
  - When a client requests a service within available [appointable] options.
  - When there is a need to synchronize with external calendar systems.

.who =
  - Home-service providers managing their schedules.
  - Clients (neighbors) booking appointments based on [appointable] slots.
  - System administrators overseeing calendar integrations.

.examples =
  - A plumber updates their [reservable] hours using <setReservable>.
  - A [reservation] is made internally (appointment) for a client's plumbing request.
  - [Appointable] options are calculated after a [reservation] is set.
  - External calendar events are integrated to ensure non-overlapping bookings.
  - An appointment is facilitated between a @[provider] and a @[neighbor].


# outline

> Compose a concise, technical narrative that elaborates on the vision. Walk us through it.

- When a provider wishes to make their work hours available, they will utilize the <setReservable> mechanism to define specific [reservable] hours.
  - These hours will be stored and managed as part of their profile within the scheduling system.
  - The system then ensures these hours are compatible with current and future [reservation] requests.

- The system calculates [appointable] resources by subtracting [reservation] times from [reservable] hours, providing available options for new appointments.

- The system handles [reservation] requests, categorizing them based on their .origin, whether internal (direct booking) or external (third-party calendars).
  - When a new booking is made, it checks against the [appointable] time to avoid conflicts.
  - An appointment is established as a [reservation].origin=internal between a @[provider] and a @[neighbor].
  - The system updates the provider's available time in real-time, reflecting both internal and external reservation status.

- External calendar integrations allow for the seamless import and synchronization of events, adjusting the [reservable] and [appointable] hours as necessary.

- This system ensures a comprehensive view of a provider’s schedule, accounting for all internal and external commitments.
  - With updates being synchronized, providers have a consistent and reliable overview of their availability.
  - Clients receive real-time information on service availability, allowing for accurate booking.


- [Resource]s: Define and describe each resource involved in the system.
  - [reservable]: Work hours that a provider can offer for appointments, set by the provider using <setReservable>.
  - [reservation]: Instances of time that have been booked, either internally or from external calendar integrations.
  - [appointable]: Available time slots for new appointments, calculated as [reservable] minus [reservation] times.
  - [reservation].origin: The source of the reservation request, denoting internal (direct booking) or external (third-party calendars).


# narrative

- Define [reservable] work hours using the <setReservable> action. Providers input their availability, which becomes the baseline for their service offering.
  - This input is verified and entered into the provider's scheduling dashboard, ensuring accuracy in available times.

- As clients (neighbors) or automated processes initiate [reservation] requests, the system checks available [appointable] slots, derived from [reservable] minus existing [reservation] slots.
  - Internal requests as appointments are straightforward, involving a [reservation].origin=internal between a @[provider] and a @[neighbor], reducing allocable time from [reservable] hours directly.
  - For external requests, the system audits external calendars, pulling in events that may further restrict or adjust [appointable] times.

- Integration of external calendars employs robust synchronization protocols, ensuring that mismatched or overlapping events are avoided.
  - Both external and internal data affect the real-time status of [reservable] and [appointable] hours, dynamically updating the service offer.

- Providers and clients (neighbors) interact with a seamless interface, which abstracts the complexity of the scheduling backend.
  - Real-time updates ensure both parties experience a smooth service transaction, with visibility into accurate scheduling data.
  - The system reduces human error and inefficiencies, contributing to provider satisfaction and client trust.

```
