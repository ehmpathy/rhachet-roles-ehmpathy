### .rule = forbid-term-row

#### .what
the term `row` is forbidden — singular and plural. it names one storage engine's unit where the domain and every other engine say `record`, and it reads four more ways besides

#### .scope
- code: variable names, function names, type names, comments
- docs: markdown, briefs, prompts
- comms: commit messages, pr descriptions
- the bare word: the hook blocks it at write time
- inside identifiers: the record is `bound: segment`, so the hook blocks `rowCount`, `getRowCount`, `userRows`, `row_id`, and `ROW_COUNT` as well
- `arrow`, `throw`, `throwError`, and `rowdy` are not banned; the hook passes them

#### .why
- every database unit is a record — relational, document, dynamodb alike. records and columns are the peers on the database side
- `row` ties the name to one engine's layout, so a switch of engine leaves a name that lies
- a reader must also guess the other senses: a line of a ui grid? an entry of a prose table? a line of seats? a quarrel? a verb (row a boat)?

#### .senses conflated by "row"

| sense | 👍 sharper word |
| --- | --- |
| a unit of any database — relational, document, dynamodb | `record` |
| a line of a prose table or a ui grid | `entry`, `line` |
| a lock on one record | `pessimistic lock` |
| a line of seats | `line` |
| a quarrel | `dispute` |
| the verb (row a boat) | `paddle` |

#### .exempt
- a verbatim quote (a title, a cited sentence)
- a name an external api or library dictates — `result.rowCount` from a postgres client, a sql keyword (`ROW_NUMBER()`). the name is not yours to change: retry the write unchanged, and cast it once at the boundary into `record`
- the briefs and the blocklist record that name the term itself: retry unchanged

#### .enforcement
- use of `row` or `rows` outside the exempt cases = **BLOCKER**
- the `pretooluse.forbid-terms.blocklist` hook blocks the first write of the word, bare or inside an identifier; a deliberate retry passes, for the exempt cases above
- extant uses are swept on touch (`rule.prefer.wickup-touched-prose`), never in a mass rewrite

#### .see also
- `philosophy.why-we-ban-terms` — why a heavy word gets banned
- `rule.forbid.term=row.example=demo` — a 👎/👍 demo
- `rule.require.ubiqlang` — one word per concept
- `rule.forbid.term=store` — a peer ban on a storage word
