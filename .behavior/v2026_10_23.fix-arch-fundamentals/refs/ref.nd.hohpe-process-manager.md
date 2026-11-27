# ref.nd.hohpe-process-manager

grade: ✅ — the authors' own pattern page (the problem and solution statements are the published pattern text)
cite: "Process Manager." *Enterprise Integration Patterns* (pattern page), enterpriseintegrationpatterns.com. https://www.enterpriseintegrationpatterns.com/patterns/messaging/ProcessManager.html
seen: `.raw/page.hohpe-process-manager.json` — fetched 2026-11-26 by `.playbooks/fetch-sources.play.ts`. the capture names the site and the book, not the authors, so this ref names none; the site is hohpe's (`ref.2004.hohpe`, same domain, self-introduced there)

## .quotes

> "How do we route a message through multiple processing steps when the required steps may not be known at design-time and may not be sequential? Use a central processing unit, a Process Manager, to maintain the state of the sequence and determine the next processing step based on intermediate results."

> "The downside of this central control element is the danger of turning the Process Manager into a performance bottleneck."

## .supports

- `pattern=async-task` — **converge**: the task as the orchestrator that holds the sequence and decides the next step from intermediate results. the pattern is silent on compensation; our task adds the rule that it decides the irreversible act only once every light is green
