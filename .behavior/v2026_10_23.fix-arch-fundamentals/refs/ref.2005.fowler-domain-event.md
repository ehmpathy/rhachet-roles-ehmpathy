# ref.2005.fowler-domain-event

grade: ✅ — the author's own page (a draft, by his own note)
cite: Martin Fowler (12 December 2005). "Domain Event." martinfowler.com, eaaDev. https://martinfowler.com/eaaDev/DomainEvent.html
seen: `.raw/page.fowler-domain-event.json` → `.json.txt` — fetched 2026-11-26 by `.playbooks/fetch-sources.play.ts`; url taken from `.raw/links.fowler-event-narrative.json`

## .quotes

> "Captures the memory of something interesting which affects the domain"

> "I characterize the data on a Domain Event as immutable source data that captures what the event is about and mutable processing data that records what the system does in response to it."

> "Although the source data can never change, it may be that the system needs to handle a change - typically because the original event was incorrect. You can handle this by receiving this change as a separate Retroactive Event."

> "When doing this it's important to consider two Time Point that could be stored with the event: the time the event occurred in the world and the time the event was noticed ."

> "The danger is picking one Time Point, and not being clear which Time Point you picked, either at the time or later. So I also suggest you name the Time Point clearly to indicate which one it is."

> "The diagram implies an asynchronous pipes and filters style of interaction, but this isn't an essential part of the approach."

## .supports

- `pattern=domain-event` — immutable source data; the event as a record of what happened
- `pattern=correction-event` — a wrong event is answered by a separate event, never an edit
- `pattern=two-time-points` — consider both, and name the one you keep
- the caveat: async is not essential
