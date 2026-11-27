### .rule = forbid-term-staging

#### .what
the term `staging` is forbidden. it is a gerund, and it is overloaded: one word for a named environment, the concept of an environment, a phase, and the act

#### .scope
- code: variable names, function names, type names, comments
- config: environment names, deploy targets, ci job names
- docs: markdown, briefs, prompts
- comms: commit messages, pr descriptions
- the bare word: the hook blocks it at write time

#### .why
- a reader must guess which sense was meant: is it one specific environment? an alias for the concept of environment? a phase of a pipeline? the act to stage?
- it names a gerund where a plain noun would serve (`rule.forbid.gerunds`)
- our environments are `test`, `prep`, and `prod`: each describes what happens there (`prefer.env_access.prep_over_dev`, architect)

#### .senses conflated by "staging"

| sense | 👍 sharper word |
| --- | --- |
| the pre-production environment | `prep` |
| the concept of an environment | `environment` |
| the access level a deploy or a key targets | `access` |
| a phase of a pipeline | `phase` |
| the changes git will commit next | `staged` (the changes), `stage` (the verb) |

#### .exempt
- a verbatim quote (a title, a cited sentence)
- a name an external system dictates — a vendor environment named for it, git's own docs. the name is not yours to change: retry the write unchanged, and cast it once at the boundary into `prep`
- the briefs and the blocklist record that name the term itself: retry unchanged

#### .enforcement
- use of `staging` outside the exempt cases = **BLOCKER**
- the `pretooluse.forbid-terms.blocklist` hook blocks the first write of the bare word; a deliberate retry passes, for the exempt cases above
- extant uses are swept on touch (`rule.prefer.wickup-touched-prose`), never in a mass rewrite

#### .see also
- `philosophy.why-we-ban-terms` — why a heavy word gets banned
- `rule.forbid.term=staging.example=demo` — a 👎/👍 demo
- `rule.forbid.gerunds` — the -ing form, banned on its own
- `rule.require.ubiqlang` — one word per concept
