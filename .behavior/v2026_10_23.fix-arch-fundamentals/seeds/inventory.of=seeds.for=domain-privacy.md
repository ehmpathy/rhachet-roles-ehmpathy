# seeds for domain-privacy

briefs seeded: `src/domain.roles/architect/briefs/practices/domain.privacy/rule.forbid.pii-egress.md` · `rule.require.pii-quarantine.md` (+ `.min` twins)

## .the words

> "we'd never allow pii to be thrown around like that. we'd mask it at the dao layer instead" — chat

> "we redact pii as early as possible, that should be an architectural rule for sure" — chat

> "its more like forbid pii out right? we allow it one way, but not out, unless its a quarantined and authorized codepath with a clear business need" — chat

## .what the briefs made of them

- pii flows one way: in, redacted at the first boundary (the dao)
- out only through a quarantined path: a named business need, quarantine, authorization, an audit without the value, direct delivery
