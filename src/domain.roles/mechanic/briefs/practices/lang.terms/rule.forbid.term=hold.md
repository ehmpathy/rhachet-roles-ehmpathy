### .rule = forbid-term-hold

#### .what
the term `hold` is forbidden — `hold`, `holds`, and `held`, as noun, verb, and status. it is overloaded: one word for a dozen senses. each sense has a clearer word

#### .scope
- code: variable names, function names, type names, enum values, comments
- docs: markdown, briefs, prompts
- comms: commit messages, pr descriptions
- the bare word: the hook blocks it at write time, case-insensitive — `HELD` and `Hold` trip it too
- inside identifiers: the record is `bound: segment`, so the hook blocks `onHold`, `isHeld`, `holdUntil`, `on_hold`, `held_at`, and `HELD_AT` as well
- `withheld`, `uphold`, `threshold`, `holder`, and `household` are not banned; the hook passes them
- the -ing form is a gerund, banned on its own (`rule.forbid.gerunds`)

#### .why
- a reader must guess which sense was meant: a status that awaits an outcome? a lock? a possession? a rule that is true? a pause?
- the word carries so much weight that readers and brains alike reach for it for whatever is paused, kept, or awaited. one word swallows several concepts, and the reader cannot tell which
- as a status, it names only that a grip exists; it says naught of the outcome it awaits
- each sense has a sharper word, and the sharper word names what is meant

#### .senses conflated by "hold"

| sense | 👍 sharper word |
| --- | --- |
| a status that awaits an outcome | the status the domain expert says, one per case: `TENTATIVE` (a reservation that awaits confirm or cancel), `QUEUED` (a task that awaits its run), `AUTHORIZED` (a card authorized, not yet captured) |
| a rule, true right now | `is true`, `stays true` |
| an operation that keeps a rule true | `preserves`, `maintains` |
| what a container has inside | `contains`, `has` |
| the part that owns the data | `owns` |
| a grip acquired | `lock`, `reserve` |
| a possession | `keep`, `own` |
| a gate | `blocks`, `stops` |
| a release or a stop put off | `pause`, `delay` |
| a belief | `believe`, `claim` |
| what a reader must recall | `keep in mind`, `track` |
| a design under stress | `survives`, `withstands` |
| a vote or a session | `ran` |

#### .exempt
- a verbatim quote (a title, a cited sentence)
- a name an external api or library dictates — a vendor's `on_hold` status, a library method named for it. the name is not yours to change: retry the write unchanged, and cast it once at the boundary into the sense's own word
- the briefs and the blocklist record that name the term itself: retry unchanged

#### .enforcement
- use of `hold`, `holds`, or `held` outside the exempt cases = **BLOCKER**
- the `pretooluse.forbid-terms.blocklist` hook blocks the first write of the word, bare or inside an identifier; a deliberate retry passes, for the exempt cases above
- extant uses are swept on touch (`rule.prefer.wickup-touched-prose`), never in a mass rewrite

#### .see also
- `philosophy.why-we-ban-terms` — why a heavy word gets banned
- `rule.forbid.term=hold.example=surf-school` — a 👎/👍 demo
- `rule.forbid.term=hold.example=one-word-three-concepts` — a real case: one word for three concepts, two of which already had precise names
- `rule.require.ubiqlang` — one word per concept
- `rule.forbid.term=state` · `rule.forbid.term=property` — the same shape of ban
