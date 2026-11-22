## .what
simple-on-disk-cache@1.8.1 (latest) pins `simple-in-memory-cache@0.4.2` and `with-bottleneck@0.1.1`, both on `domain-objects@0.31.9`, which ships a require cycle (DomainObject.js ↔ hydrateNestedDomainObjects.js) to every consumer. cycle-free from 0.31.10; `simple-in-memory-cache@0.5.1` (latest) still pins 0.31.9.

## .the shape of the fix
- simple-in-memory-cache: bump `domain-objects` → 0.34.0, release
- simple-on-disk-cache: bump `simple-in-memory-cache` → that release, `with-bottleneck` → 0.1.2 (on domain-objects 0.31.13), release

## .found by
rhachet-roles-ehmpathy's 0.50.0 upgrade (dpdm over node_modules); context: ehmpathy/declapract-typescript-ehmpathy#832
