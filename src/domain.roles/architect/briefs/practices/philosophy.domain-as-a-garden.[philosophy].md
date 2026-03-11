# philosophy.domain-as-a-garden

## .what

domain.operations are decomposed, reusable, idempotent, low-trust contract components. they encapsulate true domain knowledge and make it safe and easy to recompose into more powerful mechanisms and systems.

## .gardeners and architects

george r.r. martin distinguishes two types of writers:

> "architects do blueprints before they drive the first nail. gardeners dig a hole, plant the seed, and see what comes up."
>
> — george r.r. martin ([full quote below](#appendix-grrm-on-architects-and-gardeners))

software is not a novel, but the tension is the same.

**both are required.** you must architect each solution — design the rooms, plan the wires, blueprint the structure. there is no substitute for deliberate design.

but architects who think like gardeners make more evolvable systems. they recognize that today's blueprint is not the last blueprint. tomorrow brings new requirements, new usecases, new perspective. the question is: will tomorrow's blueprint require a teardown, or can you build on what you've grown?

the gardener's insight: **decomposition for recomposition matters more in the long term than the elegance of any single design.**

when you architect with the gardener's perspective, each solution distills domain knowledge into reusable blocks. when the next blueprint comes along, you already have the critical pieces from prior work. you can grow your system rather than endlessly refactor it.

domain.operations are how you garden while you architect — plant seeds (operations), tend them (refactor, decompose, recompose, refine), and watch the domain reveal itself through use.

## .symbiogenesis: complexity through composition

blaise agüera y arcas explores how complexity emerges in his book "what is life? evolution as computation":

> "life evolves spontaneously in environments capable of computation, like our own universe, and grows more complex over time as it enters symbiotic relationships with itself."
>
> — blaise agüera y arcas, *what is life? evolution as computation* ([mit press](https://mitpress.mit.edu/9780262554091/what-is-life/))

the key concept here is **symbiogenesis** — literally "to become through cohabitation." this theory, championed by evolutionary biologist lynn margulis, explains how major leaps in biological complexity occur not through gradual mutation but through merger:

> "symbiogenesis brings together unlike individuals to make large, more complex entities... eukaryogenesis occurred by symbiogenesis of archaea and bacteria, leading to an increase in average cell complexity."
>
> — lynn margulis ([wikipedia: symbiogenesis](https://en.wikipedia.org/wiki/Symbiogenesis))

margulis demonstrated that eukaryotic cells — the cells of animals, plants, fungi, and all complex life — arose when bacteria of different types merged. mitochondria were once free bacteria. together, they generated forms of life more complex than either could alone.

this is the pattern of domain.operations:

| biological | software |
|------------|----------|
| simple organisms | atomic operations |
| symbiotic merger | composition |
| emergent complexity | composed behaviors |
| stable identity | idempotent contracts |

domain.operations don't compete; they compose. each encapsulates one piece of domain truth. when composed, they produce behaviors neither could achieve alone — symbiogenesis in code.

## .decomposition for recomposition

decomposition is not the goal. recomposition is.

we decompose to create **recomposable units** — small, focused operations with:

| property | enables |
|----------|---------|
| **idempotent** | safe retry, safe recomposition |
| **low-trust contracts** | explicit inputs/outputs, no hidden state |
| **single responsibility** | clear boundaries for composition |
| **domain-aligned** | speaks ubiquitous language |

the value is not in many small pieces. the value is in pieces that **fit together in ways we haven't imagined yet**.

```
domain.operations/
  ├── getOneCustomer.ts          # atomic lookup
  ├── setCustomerPhone.ts        # atomic mutation
  ├── genInvoice.ts              # find-or-create
  └── syncCustomerFromStripe.ts  # composed: get + set + gen
```

`syncCustomerFromStripe` didn't exist when we wrote the atoms. but when we needed it, the pieces were ready. that's the garden in fruit.

## .dynamically-stable systems

domain.operations create **dynamically-stable** systems:

- **dynamic**: can evolve, recompose, extend without redesign
- **stable**: idempotent, predictable, safe to invoke repeatedly

this is the opposite of brittle architecture. brittle systems work only in their designed configuration. dynamically-stable systems work in configurations we haven't designed yet — because the pieces compose safely by construction.

## .burden vs leverage

| burdensome software | leverageable software |
|---------------------|---------------------|
| monolithic procedures | decomposed operations |
| implicit dependencies | explicit contracts |
| stateful, order-dependent | idempotent, composable |
| requires full grasp | pieces work in isolation |
| changes ripple everywhere | changes stay local |
| grows harder to modify | grows easier to extend |

good domain operations **mechanize domain knowledge** — they encode what we've learned about the domain in reusable form. each operation is a piece of crystallized insight that makes future work easier.

## .the core insight

> decomposition for recomposition is the core mechanism of dynamically-stable domain.operations.

we don't decompose because small is good. we decompose because **recomposition is powerful**.

like organisms that enter symbiotic relationships to create greater complexity, operations compose into systems more capable than any single operation. the garden grows not by more plants, but by the relationships between them.

## .see also

- rule.require.get-set-gen-verbs — the atomic operation vocabulary
- rule.require.idempotent-procedures — why idempotency enables recomposition
- rule.require.bounded-contexts — where operations live
- rule.prefer.wet-over-dry — let patterns emerge before abstraction

## .note on domain.objects

although the above was written for domain.operations, it applies strongly to domain.objects as well — just through narrower boundaries.

domain.objects encapsulate domain truth as data: what a Customer is, what fields an Invoice has, what makes a JobQuote unique. they compose into richer structures (nested objects, references) and evolve as the domain reveals itself.

the same gardener's insight applies: decompose objects into recomposable pieces. when the next blueprint comes, you already have the vocabulary.

## .sources

- [george r.r. martin on architects vs gardeners](https://www.goodreads.com/quotes/749309-i-think-there-are-two-types-of-writers-the-architects)
- [blaise agüera y arcas, "what is life? evolution as computation"](https://mitpress.mit.edu/9780262554091/what-is-life/)
- [lynn margulis and symbiogenesis](https://en.wikipedia.org/wiki/Symbiogenesis)

---

## appendix: full quotes

### george r.r. martin on architects and gardeners

> "i think there are two types of writers, the architects and the gardeners. the architects plan everything ahead of time, like an architect builds a house. they know how many rooms are in the house, what kind of roof they'll have, where the wires go, what kind of plumbing there'll be. they have the whole thing designed and blueprinted out before they even nail the first board up.
>
> the gardeners dig a hole, drop in a seed and water it. they kind of know what seed it is, they know if they planted a fantasy seed or mystery seed or whatever. but as the plant comes up and they water it, they don't know how many branches it's gonna have, they find out as it grows."
>
> — george r.r. martin ([goodreads](https://www.goodreads.com/quotes/749309-i-think-there-are-two-types-of-writers-the-architects))

### blaise agüera y arcas on computation and symbiogenesis

> "self-reproduction — and thus life itself — is inherently computational."

> "life evolves spontaneously in environments capable of computation, like our own universe, and grows more complex over time as it enters symbiotic relationships with itself."

> "it gets more computationally complex over time through symbiogenesis because when you have two computers that come together and start cooperating, now you have a parallel computer, and a massively parallel computation that leads to more and more parallel computation."

> "symbiosis functions as the driver of evolution, from symbiosis between instructions to make tiny programs, to symbiosis between those programs to make bigger imperfect replicators — symbiosis all the way down."

— blaise agüera y arcas, *what is life? evolution as computation* ([mit press](https://mitpress.mit.edu/9780262554091/what-is-life/), [berggruen institute](https://berggruen.org/library/what-is-life))

### lynn margulis on symbiogenesis and cooperation

> "life did not take over the world by combat, but by networking."
>
> — *microcosmos: four billion years of microbial evolution*

> "symbiogenesis brings together unlike individuals to make large, more complex entities."

> "the tendency of 'independent' life is to bind together and reemerge in a new wholeness at a higher, larger level."

> "symbiosis is not a marginal or rare phenomenon. it is natural and common. we abide in a symbiotic world."

> "at the base of the creativity of all large familiar forms of life, symbiosis generates novelty."

> "natural selection eliminates and maybe maintains, but it doesn't create."

— lynn margulis, *symbiotic planet: a new look at evolution* ([goodreads](https://www.goodreads.com/author/quotes/32342.Lynn_Margulis), [the marginalian](https://www.themarginalian.org/2022/12/21/lynn-margulis-symbiotic-planet/))
