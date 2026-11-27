# ref.2015.brooker

grade: ✅ — the author's post on the publisher's own blog (aws)
cite: Marc Brooker (2015, 4 March; updated May 2023). "Exponential Backoff and Jitter." *AWS Architecture Blog*. https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
seen: `.raw/page.brooker2015-backoff-jitter.json`, `.raw/page.brooker2015-backoff-jitter.pt2.json` — fetched 2026-11-26 by `.playbooks/fetch-sources.play.ts`

## .quotes

> "While OCC is guaranteed to make progress, it can still perform quite poorly under high contention. The simplest of these contention cases is when a whole lot of clients start at the same time, and try to update the same database row."

> "It's obvious that the exponential backoff is working, in that the calls are happening less and less frequently. The problem also stands out: there are still clusters of calls."

> "The solution isn't to remove backoff. It's to add jitter."

> "The no-jitter exponential backoff approach is the clear loser. It not only takes more work, but also takes more time than the jittered approaches."

> "Most AWS SDKs now support exponential backoff and jitter as part of their retry behavior when using standard or adaptive modes." (the 2023 update)

## .supports

- `catalog.of=pattern.transaction.bound=contract.trait=atomicity.pattern=retry-with-backoff` — backoff alone leaves clusters; jitter spreads them; the sdks now ship it
- `catalog.of=pattern.transaction.bound=storage.trait=isolation.pattern=version-check` — optimistic concurrency always progresses, yet degrades under high contention (the cue for `pattern=row-lock`)
