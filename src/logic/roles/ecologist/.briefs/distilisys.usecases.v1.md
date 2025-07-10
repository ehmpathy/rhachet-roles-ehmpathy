# usecases (distilisys format)

## format

each usecase is wrapped in a `<sys>` block and contains:
- a comment block with `.who`, `.what`, and `.why`
- a distilisys system line describing the mechanism, inputs, and drivers

example:

<sys>
/**
 * .who = [actor or user]
 * .what = [action or mechanism]
 * .why = [why this matters to them]
 */
[actor]<mechanism>({ input? })
  => {
    desire: [short-term intent],
    driver: [core motivator], // e.g. money++, trust, speed
    priority: musthave | hugetohave | nicetohave | optional | edgecase,
    gain: [benefit to the actor],
    cost: low | med | high
  }
</sys>

---

## examples

<sys>
/**
 * .who = provider
 * .what = setScheduledAppointment
 * .why = confirm work and earn income
 */
[provider]<setScheduledAppointment>({ appointment })
  => {
    desire: confirm jobs on calendar,
    driver: money++, // jobs not on calendar don’t get done
    priority: musthave,
    gain: commitment visibility for crews and clients,
    cost: med
  }
</sys>

<sys>
/**
 * .who = provider
 * .what = getScheduledAppointments
 * .why = prepare team for upcoming work
 */
[provider]<getScheduledAppointments>()
  => {
    desire: stay organized for the week,
    driver: job readiness,
    priority: hugetohave,
    gain: better daily planning,
    cost: low
  }
</sys>

<sys>
/**
 * .who = neighbor
 * .what = getSchedulableAppointments
 * .why = book a job fast without calling anyone
 */
[neighbor]<getSchedulableAppointments>({ provider })
  => {
    desire: book a job in an open slot,
    driver: time savings + trust in system,
    priority: musthave,
    gain: instant booking with confidence,
    cost: med
  }
</sys>
