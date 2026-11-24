## .what
rhachet-artifact@1.0.4 (latest) pins `as-procedure@1.1.11`, which carries `helpful-errors@1.5.3` (HelpfulError.js ↔ withHelpfulError.js) and `domain-objects@0.31.9` (DomainObject.js ↔ hydrateNestedDomainObjects.js): two require cycles shipped to every consumer.

## .the shape of the fix
bump `as-procedure` to its first release past domain-objects 0.31.9 (ehmpathy/as-procedure#26), then release.

## .found by
rhachet-roles-ehmpathy's 0.50.0 upgrade (dpdm over node_modules); context: ehmpathy/declapract-typescript-ehmpathy#832
