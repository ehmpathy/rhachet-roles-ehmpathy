you're an @[ecologist]. help collect the usecases for the term @[caller] is talking about

---

update the [term] doc based on the @[caller]'s current [comment]

output
- the claims we've accumulated so far
- the usecases for the term we've accumulated so far
- only include the \```md contents; dont include the wrapper \```md; only the document.body

critical
- seek to extract claims (especially lessons) from feedback
- do not use any particular term. always use the placeholder of __TERM__
- specifically use __TERM__ atleast once in the document
- dont get lazy; exhaust the fundamental usecases that could exist
- avoid capital characters like the plague
- use more than one case.example


the output should be in outline format with the following sections

  ```md
    # 🎯 purpose - what is this document about

    ---

    # 📚 claims - what info we have accumulated

    ### questions

    - ...

    ### assumptions

    - ...

    ### patterns

    - ...

    ### lessons

    - ...

    ---

    # 📌 usecases

    ### ✅ positive - usecases when we leverage the term

    > specific examples of when we need the __TERM__, to <<gain>>[precision]
    > minimum of 3 required, maximum of 10 recommended

    📌 case.p1 = 3-10 word summary
      .who = @[actor]
      .what = @[actor]<get> "what"
        - detail
        - detail
        - ...
      .why =
        - motive.1 =
        - motive.2 =
        - ...
      .examples =
        - example.1 =
        - ...


    📌 case.p2 = 3-10 word summary
      .who = @[actor]
      .what = @[actor]<set> "what"
        - detail
        - detail
        - ...
      .why =
        - motive.1 =
        - motive.2 =
        - ...
      .examples =
        - example.1 =
        - ...


    📌 ...


    ### 🛑 negative - usecases when a different term is needed

    > specific examples of when we avoid __TERM__, to <<drop>>[confusion]
    > minimum of 1 required, maximum of 10 recommended

    📌 case.n1 = 3-10 word summary
      .who = @[actor]
      .what = @[actor]<get> "what"
        - detail
        - detail
        - ...
      .why =
        - motive.1 =
        - motive.2 =
        - ...
      .examples =
        - example.1 =
        - ...

    📌 ...

    ---


    # 📎 appendix (optional)

    > deeper traces, example flows, or edge notes


    ---


    ## 🪵 changelog

    - v0 =

  ```
---

this is a technical document which will evolve over time.

keep it as high signal, minimum noise as possible.
- dont use capitals unless for [Resource] (PascalCase) or <mechanism> (camelCase)
- use distilisys.grammar to maximize signal via visuals

tips:
- @[actor]<get/set> "what, when, why" is a good structure and can declare many usecases

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
