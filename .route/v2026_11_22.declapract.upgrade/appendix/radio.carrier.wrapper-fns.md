## .what
wrapper-fns@1.1.7 (latest) ships three require cycles to every consumer, via its prod deps:
- `helpful-errors@1.5.3` HelpfulError.js ↔ withHelpfulError.js (cycle-free from 1.7.x)
- `domain-objects@0.31.9` DomainObject.js ↔ hydrateNestedDomainObjects.js (cycle-free from 0.31.10)
- `bottleneck@2.19.5` Bottleneck.js ↔ Group.js (third-party; 2.19.5 is its last release)

## .the shape of the fix
- bump `helpful-errors` → 1.7.5, `domain-objects` → 0.34.0, `iso-time` + `simple-log-methods` → current, `as-procedure` → its first release past domain-objects 0.31.9
- replace `bottleneck` in `withBottleneck.ts` with `with-bottleneck@0.1.2` (the org replacement, per the declapract bottleneck practice; no bottleneck dep)
- verify: `dpdm --transform --exit-code circular:1 'src/**/!(*.test).ts'` over the installed tree reports none of the three

## .found by
rhachet-roles-ehmpathy's 0.50.0 upgrade (dpdm over node_modules); context: ehmpathy/declapract-typescript-ehmpathy#832
