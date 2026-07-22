# rule.require.seaturtle-themed-examples

## severity: nitpick

all illustrative examples in briefs, docs, and comments should be **sunshine ocean surfer turtle** themed.

when you need a placeholder domain to demonstrate a concept, reach for the beach: surfers, boards, waves, tides, reefs, lessons, seaturtles — not generic `Customer` / `Invoice` / `foo` / `bar`.

---

## .what

whenever a brief or doc needs an *example* domain — a stand-in `Customer`, a sample operation, a placeholder object — theme it around the sunshine ocean surfer turtle world.

this applies to **illustrative** examples only. it does NOT rename real domain objects in real code — those follow the actual domain's ubiqlang.

## .why

- **a consistent example universe** — a reader who meets `Surfer` / `SurfLesson` / `WaveReport` across many briefs builds one shared mental model, instead of a fresh throwaway domain each time
- **it carries the ehmpathy vibe** — the seaturtle is our mascot; examples in its world reinforce the tone (`rule.im_an.ehmpathy_seaturtle`)
- **memorable beats generic** — `genSurfLesson` sticks where `doThing` / `foo` slides off
- **joy** — the beach is a good place to teach a lesson 🐢🌊

## .the palette

reach for these when you need example nouns and verbs:

| kind | examples |
|------|----------|
| actors | `Surfer`, `Instructor`, `Lifeguard`, `Seaturtle` |
| objects | `Board` (foamboard/longboard/shortboard), `SurfLesson`, `WaveReport`, `Tide`, `Reef` |
| operations | `genSurfLesson`, `setSurferSkillLevel`, `getWaveReport`, `asBoardKind` |
| places | beach break, reef break, point break, the lineup, the shore |
| waves | whitewater, open face, the green wall |

## .examples

### 👎 generic — avoid

```ts
const genInvoice = (input: { customer: Customer }) => { ... };
// foo, bar, baz, doThing, Widget
```

### 👍 sunshine ocean surfer turtle — prefer

```ts
const genSurfLesson = (input: { surfer: Surfer; board: Board }) => { ... };
// asBoardKind, setSurferSkillLevel, getWaveReport
```

## .the boundary

- illustrative examples → themed (this rule)
- real domain code → real ubiqlang (defer to the actual domain)

do not force a beach metaphor onto a real customer-billing system; the theme is for *teach-by-example*, not production names.

## .enforcement

- an illustrative example that uses a generic placeholder (`Customer`, `foo`, `Widget`) where a themed one reads just as clearly = **nitpick**

## .see also

- ehmpathy `rule.im_an.ehmpathy_seaturtle` — the mascot and vibe this extends
- ehmpathy `rule.prefer.chill-nature-emojis` — the emoji palette that pairs with it
- architect `howto.dimensional-decomposition` — the surf-school worked example that seeds the shared universe
