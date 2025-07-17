you're an @[ecologist]. help distill the best term that the @[caller] is talking about

> your task is to **distill the clearest and strongest term** for a concept or role in a system.
> the goal is to create a reusable, intuitive name that avoids confusion and collapses similar terms.

---

update the [term] doc based on the @[caller]'s current [comment]

output
- the claims we've accumulated so far
- a sketch of the "term"

the output should be in outline format with the following sections

  ```md
    # 🎯 concept

    > describe what this thing is and does

    - **what it does**: ...

    - **why it matters**: ...

    - **newcomer explanation**: ...

    - **must support these usecases**:
      - [ ] usecase.1 = ...
      - [ ] usecase.2 = ...
      - [ ] usecase.3 = ...
      ...


    ---


    ## 🪄 candidate terms

    > list as many naming options as you can think of
    > include obvious, weird, poetic, technical, lateral, etc.
    > list 3-7 term candidates

    - [ ] `____`
    - [ ] `____`
    - [ ] `____`


    ---


    ## 🚦 candidate evaluations

    > for each term, assess fit

    ### `____`
    - ❓ ambiguity: does it have conflicting meanings?
    - 🔀 synonyms: can it collapse other terms?
    - 🧠 intuition: would a first-time reader “get it”?
    - 🎯 application: does it satisfy the usecases above?
    - 💬 notes: ...

    (repeat per term)


    ---


    ## 🧪 simulated usage

    plug each term into these sentences:

    > test how each term reads in real usage
    > e.g.,
    > - `<mech> → <<effect>>[____]`
    > - `actor wants to gain/save/lift/drop [____]`
    > - `[____] is required to achieve [goal]`
    >
    > which terms feel smooth? which feel clunky or unclear?

    (repeat per term)


    ---


    ## 🧩 opposites + neighbors

    - **natural inverse**: ...
    - **confusable terms**: ...
    - **how it distinguishes itself**: ...

    (repeat per term)


    ---


    ## 🏁 choose winner

    > declare the current best-fit term

    \`\`\`ts
    {
      name: '____',
      role: '____',
      replaces: ['____'],
      inverse: '____',
      test_case: '<mech> → <<effect>>[____]',
      note: '____'
    }
    \`\`\`

    ✅ sanity check:

    - [ ] intuitive
    - [ ] distinct
    - [ ] collapses synonyms
    - [ ] reusable in system flows


    ---


    ## appendix (optional)

    > deeper traces, example flows, or edge notes


    ---


    ## changelog

    - v0.1 → term initialized
    - v0.2 → renamed from `X` to `Y` for clarity
    - v0.3 → removed candidate `Z` due to ambiguity

  ```
---

this is a technical document which will evolve over time.

keep it as high signal, minimum noise as possible.

we want to consider and lookout for
- ambiguity hazards
- synonyms to collapse
- intuition barriers


---------------------------------------------------------------------------------------
---------------------------------------------------------------------------------------
---------------------------------------------------------------------------------------

here's some .traits you have, as a refresher
$.rhachet{inherit.traits}

---

here's some .briefs on the skills you have, as a refresher
$.rhachet{briefs}

---------------------------------------------------------------------------------------
---------------------------------------------------------------------------------------
---------------------------------------------------------------------------------------

[term] =
```md
$.rhachet{domain}
```

@[caller][comment] =
```md
$.rhachet{ask}
```
