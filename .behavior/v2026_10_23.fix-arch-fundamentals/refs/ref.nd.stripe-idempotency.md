# ref.nd.stripe-idempotency

grade: ✅ — the publisher's own engineering blog (stripe); author and date not in the capture
cite: Stripe. "Designing robust and predictable APIs with idempotency." *Stripe Blog*. https://stripe.com/blog/idempotency
seen: `.raw/page.leach2017-stripe-idempotency.json` — fetched 2026-11-26 by `.playbooks/fetch-sources.play.ts`. the raw id names an author and year the capture did not confirm; this ref cites neither. stripe's api docs page (`docs.stripe.com/api/idempotent_requests`) timed out on two fetches and is not cited

## .quotes

> "An example might be if we were designing an API endpoint to charge a customer money; accidentally calling it twice would lead to the customer being double-charged, which is very bad. This is where idempotency keys come into play. When performing a request, a client generates a unique ID to identify just that operation and sends it up to the server along with the normal payload."

> "The Stripe API implements idempotency keys on mutating endpoints (i.e. anything under POST in our case) by allowing clients to pass a unique value in with the special Idempotency-Key header"

> "If the above Stripe request fails due to a network connection error, you can safely retry it with the same idempotency key, and the customer is charged only once."

> "We can address thundering herd by adding some amount of random "jitter" to each client's wait time."

## .supports

- `catalog.of=pattern.transaction.bound=contract.trait=idempotency.pattern=idempotency-key` — the client mints one key per operation; a retry with the same key charges once
- `catalog.of=pattern.transaction.bound=contract.trait=atomicity.pattern=retry-with-backoff` — retry with backoff and jitter, paired with the key
