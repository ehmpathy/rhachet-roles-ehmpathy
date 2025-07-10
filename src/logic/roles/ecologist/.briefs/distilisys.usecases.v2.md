.tactic = lang:distilisys:usecases

.what = usecase expression format using distilisys to tie real-world actions to system behavior

.why:
  - forces every usecase to declare intent (`.why`), actor (`.who`), and mechanism (`.what`)
  - keeps each scenario grounded in what matters — actual goals, not just features
  - enables easy mapping to system primitives via `[resource]<mechanism>() => {driver}`

.how:
  - each usecase is wrapped in a `<sys>` block
  - begins with a comment block:
    - `.who` = real actor (not abstract roles)
    - `.what` = action they perform
    - `.why` = reason this action matters
  - followed by a system line using `[resource]<mechanism>() => {driver}`
  - add:
    - `desire`: the immediate goal
    - `driver`: core pressure or incentive
    - `priority`: musthave, hugetohave, nicetohave, optional, edgecase
    - `gain`: benefit delivered
    - `cost`: low, med, or high complexity

.format:
```ts
/**
 * .who = [actor]
 * .what = [action or verb]
 * .why = [why this matters]
 * .why^2 = why they want that why
 * .why^3 = why they want that why^3 - 3 layers deep for thorough thought
 */
[resource]<mechanism>({ input? })
  => {
    desire: [short-term benefit],
    driver: [core motivator],
    priority: musthave | hugetohave | nicetohave | optional | edgecase,
    gain: [value it provides],
    cost: low | med | high
  }
```

.examples:

```ts
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
```

```ts
/**
 * .who = neighbor
 * .what = getSchedulableAppointments
 * .why = book quickly without back-and-forth
 */
[neighbor]<getSchedulableAppointments>({ provider })
  => {
    desire: find a time and lock it in,
    driver: speed++, convenience++, trust++,
    priority: musthave,
    gain: instant booking,
    cost: med
  }
```

.related:
  - tactic: lang:distilisys (for modeling systems visually)
  - tactic: name:ubiqlang (for naming resources and mechanisms)
