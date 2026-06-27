# tldr

## severity: blocker

forbid time assumptions: code must not assume latency bounds or time behavior.

hard-coded timeouts, unbounded polls, and assumed latencies fail under real-world conditions.

---
---
---

# deets

## .what

review for assumptions about time, latency, or duration.

## .scope

applies to **production code**. test infrastructure has different constraints — see `ref.reviewer.test-infrastructure-context.md`.

**in scope:**
- domain.operations/, domain.objects/, contract/, access/

**out of scope:**
- *.test.ts, *.integration.test.ts, *.acceptance.test.ts
- eval harnesses (delegate time to base tools)

## .why

time assumptions fail when:
- network latency spikes
- services slow under load
- clocks drift between systems
- retry loops never terminate

## .how

for each operation, check:
- does this use setTimeout/setInterval with magic numbers?
- does this poll without backoff or max attempts?
- does this assume network/disk latency bounds?

## .examples

### blocker — unbounded poll

```ts
// polls forever if condition never met
while (!await isReady()) {
  await sleep(100);
}
```

fix: add max attempts and backoff

```ts
const MAX_ATTEMPTS = 10;
let attempts = 0;
while (!await isReady()) {
  if (++attempts >= MAX_ATTEMPTS) {
    throw new Error('timeout after max attempts');
  }
  await sleep(100 * Math.pow(2, attempts)); // exponential backoff
}
```

### blocker — assumed latency

```ts
// assumes api responds in 100ms
await Promise.race([
  fetchData(),
  sleep(100).then(() => { throw new Error('timeout'); }),
]);
```

fix: use configurable timeout with sensible default

```ts
const TIMEOUT_MS = config.fetchTimeoutMs ?? 5000;
await Promise.race([
  fetchData(),
  sleep(TIMEOUT_MS).then(() => { throw new Error('timeout'); }),
]);
```

## .note

for test infrastructure, time assumptions are often delegated to base tools (rhx, brain infra) that handle retries.
