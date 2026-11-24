## .what
@ehmpathy/as-command@1.0.5 (latest) ships a require cycle to every consumer: `bottleneck@2.19.5` Bottleneck.js ↔ Group.js. bottleneck is third-party and 2.19.5 is its last release, so no bump cures it.

## .the shape of the fix
replace `bottleneck` with `with-bottleneck@0.1.2` (the org replacement, per the declapract bottleneck practice; no bottleneck dep). verify with dpdm over the installed tree.

## .found by
rhachet-roles-ehmpathy's 0.50.0 upgrade (dpdm over node_modules); context: ehmpathy/declapract-typescript-ehmpathy#832
