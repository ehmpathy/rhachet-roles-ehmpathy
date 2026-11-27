# ref.2018.ousterhout

grade: ✅ for each quote below (the book's own text, google books snippet view); ☑️ for the metadata (google books record, not the publisher page — publisher not captured)
cite: John K. Ousterhout (2018). *A Philosophy of Software Design*. pages cited: 23, 46, 55, 79.
seen: `.raw/page.ousterhout2018-deep-module.text.md` · `.raw/page.ousterhout2018-pass-through.text.md` · `.raw/page.ousterhout2018-simple-interface.text.md` · `.raw/page.ousterhout2018-define-errors.text.md` — google books full-text searches, read by `.playbooks/open-ousterhout-tabs.play.ts` + `.playbooks/save-ousterhout-tabs.play.ts` once a human cleared google's traffic wall. each result names "A Philosophy of Software Design - Page N · John K. Ousterhout · 2018 · Snippet view".

## .quotes

> "The best modules are those with the greatest benefit and the least cost." (p. 23, beside the deep-module figure: "Interface (cost: less is better) … Functionality (benefit: more is better)")

> "A pass-through method is one that does little except invoke …" (p. 46, §7.1 "Pass-through methods"; the snippet cuts off here)

> "… simple interface than a simple implementation." (p. 55; the snippet opens mid-sentence. the full sentence, "It is more important for a module to have a simple interface than a simple implementation", is quoted by binaryphile, and its tail matches the book)

> "… define errors out of existence." (p. 79; the chapter's own phrase)

## .corrections this fetch forced

the secondary quotes the catalog first carried did not match the book:

| member | secondary quote, replaced | book |
|---|---|---|
| `kind=deep-module` | "The best methods are those that provide a lot of functionality but have a very simple interface…" | p. 23, above |
| `kind=one-abstraction-per-layer` | "does nothing except pass its arguments to another method, usually with the same API" | p. 46: "does little except invoke …" |
| `kind=define-errors-away` | "The best way to handle exceptions is to define APIs so they don't have exceptions." | not found in the book; the confirmed text is the phrase on p. 79 |

## .supports

- A03 deep module · A04 pull complexity down · A05 define errors out of existence · A07 pass-through layers (`catalog.of=tactic.abstraction`)
