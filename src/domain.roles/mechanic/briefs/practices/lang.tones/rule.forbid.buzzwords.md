### .rule = forbid-buzzwords

#### .what
buzzwords must be avoided — they obscure intent

#### .scope
- code: variable names, function names, type names, comments
- docs: markdown, briefs, prompts, commit messages
- comms: pr descriptions, reviews, discussions

#### .why
buzzwords have **large gravity** — they pull the mind toward them

this gravity causes **semantic diffusion**:
- the word feels meaningful, so thought stops
- precision erodes because the term is overloaded
- ambiguity creeps in because everyone maps it to their own interpretation
- communication degrades because we think we agree when we don't

it's a smell. flies buzz around smells. we don't like smells -> we dont like buzz.

#### .instead
think from the core. build the concept from the ground up.

find the most appropriate non-buzz word:
- what specifically do you mean?
- what is the precise action, object, or attribute?
- what word captures exactly this, with no surplus baggage?

precision > familiarity. clarity > trendiness.

#### .enforcement
buzzwords = **BLOCKER** on first encounter. if retry with justification, allow.

#### .the test
if you remove the buzzword and the sentence still makes sense — you didn't need it.
if you replace it with a concrete term and meaning is preserved — use the concrete term.
if you can't replace it with anything concrete — you don't know what you mean yet.

#### .note: context matters
some terms are buzzwords in one context but precise in another:
- `scalable` in marketing = buzz
- `scalable` in distributed systems with defined semantics = maybe ok (but still prefer specifics)

when in doubt, be more specific.

#### .see also
- `rule.prefer.lowercase` — no shouts
- `rule.require.ubiqlang` — consistent terminology
