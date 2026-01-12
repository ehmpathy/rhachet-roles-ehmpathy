### .rule = forbid-gerunds

#### .what
gerunds (-ing words used as nouns) are forbidden in all contexts

#### .scope
- code: variable names, function names, class names, comments
- docs: markdown, READMEs, briefs, prompts
- logs: error messages, debug output
- comms: commit messages, PR descriptions, slack

#### .why
- gerunds are vague — they obscure whether something is a noun or verb
- gerunds drift meaning — "processing" could mean the act, the state, or the result
- gerunds hide agency — "handling errors" vs "error handler" vs "handle error"
- gerunds bloat — they add syllables without precision
- alternatives are always clearer and more direct

#### .termsmell
gerunds signal that the domain has not been sufficiently thought through:
- a gerund is a lazy placeholder for a precise concept
- "processing" avoids the question: is this a `processor`, a `process`, or a `result`?
- "existing" avoids the question: is this `found`, `prior`, or `current`?
- when you reach for a gerund, pause and ask: *what is this thing, really?*
- the search for the right non-gerund term forces domain clarity

#### .see also: rule.require.order.noun_adj
the `[noun][adjective]` order rule works hand-in-hand with gerund elimination:
- `existingUser` (gerund) → `userFound` (noun + past participle)
- `currentOwner` → `ownerCurrent`
- `matchingRecord` → `recordMatched`

this pattern:
- eliminates gerunds naturally via past participles as adjectives
- enables autocomplete groups (`user*` shows all user variants)
- forces precision: `userFound`, `userCreated`, `userBefore`, `userAfter`

#### .enforcement
gerund usage = **BLOCKER**

#### .alternatives

| 👎 gerund | 👍 alternative | .why |
|-----------|----------------|------|
| `existing` | `found`, `current`, `prior` | state, not action |
| `processing` | `process`, `processor`, `processed` | verb, agent, or result |
| `handling` | `handle`, `handler` | verb or agent |
| `loading` | `load`, `loader`, `loaded` | verb, agent, or result |
| `running` | `run`, `runner`, `active` | verb, agent, or state |
| `pending` | `queued`, `awaited`, `unresolved` | explicit state |
| `missing` | `absent`, `notFound`, `lacks` | explicit state or verb |
| `remaining` | `left`, `rest`, `residual` | noun or adjective |
| `matching` | `matched`, `match`, `fits` | result, noun, or verb |
| `composing` | `composer`, `compose` | agent or verb |
| `naming` | `name`, `named` | noun or result |

#### .examples

**👎 bad**
```ts
const existingUser = await findUser();     // gerund
const processingQueue = [];                 // gerund
const handlingErrors = true;                // gerund
// we are currently loading the data        // gerund in comment
```

**👍 good**
```ts
const userFound = await findUser();         // past participle = result
const processQueue = [];                    // noun
const errorHandler = createHandler();       // agent noun
// load the data now                        // imperative verb
```

#### .note: participles vs gerunds
- **gerund** = -ing word used as a noun ("the running of tests")
- **present participle** = -ing word used as adjective/verb ("tests are running")
- participles in verb phrases are acceptable: `isRunning`, `wasProcessed`
- but prefer explicit state: `status === 'active'` over `isRunning`

#### .note: compound verbs
- some -ing words are part of compound verbs and acceptable in that form
- e.g., `context.brain.repl.imagine` — "imagine" ends in -ine, not -ing
- but `startProcessing()` should be `startProcess()` or `process()`
