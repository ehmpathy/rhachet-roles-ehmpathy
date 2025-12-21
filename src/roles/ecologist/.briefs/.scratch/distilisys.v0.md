.tactic = lang:distilisys

.what = a minimal, visual language for declaring system behavior via resources, mechanisms, and drivers

.where:
  - intended as a canonical representation of systems for longterm reference
  - used to declare a distilled representation of systems, regardless of the domain
  - applies to systems across all domains: economies, ecologies, construction, physics, architecture, legal, software, etc
  - used in system mapping, architecture design, and domain understanding

.why:
  - distills system complexity into visual steps using just three primitives
  - simplifies knowledge into easy to read and grok syntax; maximum signal, minimum noise
  - bridges business thinking with technical implementation
  - prevents bloated diagrams or code-first modeling traps
  - centers every system on purpose (`{driver}`), not just structure
  - reveals system shape and pressure using intuitive language

.how:
  - use `[resource]` to represent nouns or stateful domain objects
    - must be observable (e.g., `[paperRoll]`, `[lead]`, `[invoiceDraft]`)
  - use `<mechanism>` to represent verbs or transforming procedures
    - must describe one atomic action (e.g., `<pressAndDry>`, `<assignCrew>`)
  - use `{driver}` to declare system incentives or pressures
    - must be causal, not just contextual
    - four canonical forms:
      - `[actor]{+incentive}` → actor is *motivated* to act (e.g., `[pro]{+wantsMoreJobs}`)
      - `[actor]{-decentive}` → actor is *deterred* from acting (e.g., `[customer]{-annoyedByDelay}`)
      - `[world]{+tailwind}` → external force *enables* progress (e.g., `[season]{+peakDemand}`)
      - `[world]{-headwind}` → external force *resists* progress (e.g., `[policy]{-strictRegulation}`)

  - use `->` to chain flows
    - always show what the input is and what the mechanism produces
  - use `?` to mark an optional path
    - clearly declare what step is conditionally invoked

  - **note on cycles:**
    cycles (loops in resource flow) are key systemic features
    - often dominate long-term behavior (e.g., feedback loops, flywheels, starvation)
    - should be made explicit in modeling when they exist

.examples:
  .positive:
    ```sys
      @[neighbor]<getLawnCareApt>
      =
          [lawn]
          -> @[neighbor]<getLawnState>
          -> [lawn].looks=poor

          -> @[neighbor]<getLawnCareQuotes>
          -> [quoteList]

          -> @[neighbor]<choosePro>
          -> [jobBooked]

            => [neighbor]{+incentive:[status]++:keepUpWithJoneses}

            => [platform]{+incentive:[money]++:transactionFee}
            => [platform]{+incentive:[trust]++:fromNeighbors}
            => [platform]{+incentive:[trust]++:fromProviders}


      @[provider]<winLawnCareSubscription>
      =
          @[neighbor]<getLawnCareApt>
          -> [jobBooked]

          -> @[pro]<acceptJob>  <-------------------------
          -> @[pro]<doTheWork>                            |
          -> [lawn].looks=great                           |
                                                          |
          -> @[neighbor]<leaveReview>                     |
          -> [review]                                     |
                                                          |
          -> @[platform]<updateProReputation>             |
          -> [pro].rating++                               |
                                                          |
          -> @[platform]<promptRebooking>                 |
          -> @[neighbor]<bookFollowup>                    |
          -> [jobBooked]   // 🔁 cycle   -----------------

            => [pro]{+incentive:[money]++:jobPayout}
            => [pro]{+incentive:[trust]++:goodReview}
            => [pro]{+incentive:[safety]++:futureWork}

            => [neighbor]{+incentive:[safety]++:sameProSameQuality}
            => [platform]{+incentive:[retention]++:repeatBooking}
    ```

    ```sys
    [pulp]
      -> <bleach>?
      -> [refinedPulp]

        => [world]{+tailwind:[compliance]++:regulationRequiresWhitening}
    ```

  .negative:
    - `<processData>` → unclear mechanism (not domain-specific)
    - `[user]` → generic placeholder, not domain-grounded
    - `<sync>` used in multiple contexts (sync to cloud, sync data types)
    - `{driver}` omitted — makes system intent ambiguous

.recommendations:
  - start every system by identifying the `{driver}`
  - ask: what `[resource]` do we begin with, and what `[resource]` do we want to end with?
  - declare every intermediate `<mechanism>` clearly and name its output `[resource]`
  - tag each chain with a causal `{driver}` to clarify purpose
  - explicitly mark any **cycles** — they are critical to system behavior

.related:
  - tactic: name:ubiqlang (to name each `[resource]` and `<mechanism>` properly)
