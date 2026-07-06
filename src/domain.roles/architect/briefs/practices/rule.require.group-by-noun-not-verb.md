# rule.require.group-by-noun-not-verb

## .what

when you group files into subdirectories, group by **noun** (the domain subject the code is about), not by **verb** (the operation type the code performs).

## .why

- nouns are the domain; verbs are merely how we act on it
- noun groups co-locate all code about one subject — easy to grasp the subdomain in one place
- verb groups scatter one subject across many dirs — to comprehend `verdict`, you'd hop between `get/`, `compute/`, `run/`
- noun groups mirror the ubiquitous language; verb groups mirror implementation mechanics
- noun groups stay stable as operations evolve; a `get` can become a `gen` without a dir relocation

## .the smell

verb-named directories signal a verb-based group:

```
src/domain.operations/
  get/                          ← verb
    getOneTurtle.ts
    getAllNestsForBeach.ts
    getOneHatchlet.ts
  set/                          ← verb
    setTurtleTag.ts
    setNestStatus.ts
  compute/                      ← verb
    computeHatchSuccess.ts
    computeMigrationRoute.ts
  sync/                         ← verb
    syncTurtleFromSatellite.ts
```

these names describe *what the code does*, not *what it is about*. to understand `turtle`, you hop between `get/`, `set/`, `sync/`. the domain is scattered.

## .the fix

name directories after the domain nouns, nest by subdomain:

```
src/domain.operations/
  turtle/                       ← noun: the seaturtle
    getOneTurtle.ts
    setTurtleTag.ts
    health/                     ← nested noun: health subdomain
      getTurtleHealth.ts
      setTurtleHealthCheck.ts
    location/                   ← nested noun: location subdomain
      syncTurtleFromSatellite.ts
      getTurtleLocation.ts
      computeMigrationRoute.ts
  nest/                         ← noun: the nest
    getAllNestsForBeach.ts
    setNestStatus.ts
    sensor/                     ← nested noun: sensor subdomain
      getNestTemperature.ts
      computeHatchSuccess.ts
  hatchlet/                     ← noun: the baby turtle
    getOneHatchlet.ts
    setHatchletRelease.ts
  beach/                        ← noun: the beach
    getOneBeach.ts
    getAllBeachesForSeason.ts
```

each noun dir holds all grains for that subject. nested nouns carve out subdomains when a noun grows complex.

## .heuristic

ask: "what is this file *about*?" — that answer is the directory.

| file | about (noun) | not |
|------|--------------|-----|
| `getOneTurtle.ts` | turtle | get |
| `syncTurtleFromSatellite.ts` | turtle/location | sync |
| `computeHatchSuccess.ts` | nest/sensor | compute |
| `setNestStatus.ts` | nest | set |

the verb still leads the **filename** (per get-set-gen-verbs); it just must not lead the **directory**.

## .note: defer to established convention with evidence

this rule governs how you introduce or reshape structure. it is not a mandate to churn.

if a verb-based group is already **established in this project with evidence** (consistent, widespread, structural), defer to that convention rather than fracture consistency for one corner. evidence means: you can point to the established pattern across the codebase, not merely a single prior file.

prefer consistency with a proven local convention over local correctness. when no such convention is established, group by noun.

## .enforcement

- new verb-named directory (e.g. `get/`, `run/`, `compute/`) without established-convention evidence = blocker
- a single noun's files scattered across multiple verb dirs = blocker

## .see also

- `rule.prefer.most-common-denominator` — where a file should live (placement depth)
- `rule.require.get-set-gen-verbs` — verbs lead the filename, not the directory
- `rule.require.bounded-contexts` — domains own their nouns
