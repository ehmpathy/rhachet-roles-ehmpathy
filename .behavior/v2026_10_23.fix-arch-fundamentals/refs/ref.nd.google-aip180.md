# ref.nd.google-aip180

grade: ✅ (the publisher's own page; no date captured)
cite: Google (n.d.). AIP-180: Backwards compatibility. API Improvement Proposals. https://google.aip.dev/180
seen: `.raw/page.aip180.json`

## .quote

> "APIs are fundamentally contracts with users, and users often write code against APIs that is then launched into a production service with the expectation that it continues to work"

> "Existing client code must not be broken by a service updating to a new minor or patch release."

> "An API which has a more limited scope (for example, an API which is only called by client code written by the same team as the API producer, or deployed in a way which can enforce updates) should carefully consider its own compatibility requirements."

## .supports

- converge: the guarantee lives at the release boundary, where clients write code against it and expect it to continue to work
- a surface of narrower scope (callers from the same team, or updates it can enforce) weighs its own compatibility needs — the page says "carefully consider", not "owes less"
