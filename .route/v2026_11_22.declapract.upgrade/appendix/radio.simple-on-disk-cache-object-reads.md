## .what
1.8.x returns an object value as its json string on every read, and the in-process read now behaves like the disk read. in 1.7.10, `setWithMemory` kept the raw object in a memory layer, so the re-read that with-simple-cache does right after each set returned the object; 1.8.1 reads through to the envelope (`envelope/asValueFromEnvelope.js:21`: `JSON.stringify(envelope.value)`).

so any consumer that wraps this cache with `withSimpleCacheAsync` and no explicit value serde (the default is a no-op) gets a json string back on a fresh run, where 1.7.10 handed back the object. in rhachet-roles-ehmpathy this read `result.compressed` as undefined in 12 wrappers.

1.7.10 already returned strings across processes (`cache.js:154`), so the bug was latent; 1.8 makes it reach the first call. related: #49 (a json string scalar reads back unquoted).

## .the shape of the fix
either the cache returns the value as set (an object stays an object, on every path), or its readme states that values are strings and that object values need `serialize.value` / `deserialize.value`, with a release note that names the 1.8 change. a consumer-side clamp ships in rhachet-roles-ehmpathy#1463 (`compress.cache.serde.integration.test.ts`).

## .found by
rhachet-roles-ehmpathy's 0.50.0 upgrade, pr #1463
