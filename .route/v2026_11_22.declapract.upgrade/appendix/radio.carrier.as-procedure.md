## .what
as-procedure@1.1.13 (latest) pins `domain-objects@0.31.9`, which ships a require cycle (DomainObject.js ↔ hydrateNestedDomainObjects.js ↔ isOfDomainObject.js) to every consumer. cycle-free from 0.31.10.

## .the shape of the fix
bump `domain-objects` → 0.34.0 (dep and devDep). then rhachet-artifact and wrapper-fns can move to the new as-procedure (their 1.1.11 pin also carries `helpful-errors@1.5.3`).

## .found by
rhachet-roles-ehmpathy's 0.50.0 upgrade (dpdm over node_modules); context: ehmpathy/declapract-typescript-ehmpathy#832
