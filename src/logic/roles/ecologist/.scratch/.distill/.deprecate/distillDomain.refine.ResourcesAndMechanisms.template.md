REFINE THE CURRENT NAMES IN `sofar`

you are a precise, creative namer — obsessed with clarity, pattern, and intuitive language.

### 🎯 your job
focus ONLY on the `.term` / `.slug` values in `sofar`.
these are the names of real-world resources and mechanisms.
your goal: **rename each one for maximum clarity, symmetry, and intuition.**
expect that significant changes may be required

specifically: maximize the number of terms shared by resources and mechanisms. look for opportunities to use synonyms to do so. especially for prefixes.

### output

```json
{
  objective: string, // state your objective
  strategy: string, // state your strategy
  largestCommonPrefix: string, // state the largest common prefix we can use
  resources: [{
    represents: string, // what this term's purpose is to represent
    term: {
      // what a single word that represents the atomic unit of this resource? (not the collection, but the tiniest unit we need to represent)
      atom: {
        options: [string],
        choice: {
          term: string,  // distill the term down to one word, to get its most representative form in this bounded context, and how its commonly spoken of
          usage: "We insert one {atom}...", // use it in a sentence to prove that its clearly and ubiquitously correct
        },
      }

      // what is a multiple word that represents the resource; maximize prefix/suffix overlap with peers
      complete: {
        options: [string],
        choice: {
          term: string,  // then prefix it / suffix it to maximize overlap with the other terms in this domain && disambiguate across others
          usage: "We insert one {complete}...", // use it in a sentence to prove that its clearly and ubiquitously correct
        },
      }
    }

    // the peers it overlaps terms with; if none, []
    overlaps: [{
      withResource: peerterm, // only other resources are peers for resources
      commonPrefixes: string[],
      commonSuffixes: string[],
    }]
  }]
}
```

literally maximize the number of terms that are in common between them
- especially maximize prefixes
- secondarily maximize suffixes

---

### 🔁 top priority: shared term overlap

**the single most important thing:**
> maximize shared words across related terms in the same domain.

- aim for **prefix matches** (e.g. `itemsStocked` ⟷ `itemsOrderable`)
- aim for **suffix matches** (e.g. `openInvoice` ⟷ `closeInvoice`)
- aim for **both matches** (e.g. `JobQuotedEvent` ⟷ `JobScheduledEvent`)
- align structure, rhythm, and length wherever possible
- look for rhyme or polar symmetry
- prefer shared **1-3 word stems** over loosely related names

---

### 🧼 also improve

- **clarity**
  - remove vague or overloaded terms (e.g. `state`, `info`, `handler`)
  - fix any name that can be read in more than one way

- **intuition**
  - prefer grounded, simple language over jargon
  - ask: _would a new teammate instantly get this?_

---

### 🧠 naming mindset

- symmetry is not cosmetic — it’s how humans scan and relate ideas
- matching prefixes = instant pattern recognition
- if two things are related, **they should sound related**

---

### 🧰 tactics

- align pairs, groups, and flows (e.g. `orderPlaced` ⟷ `orderShipped`)
- compress clunky names without losing precision
- rewrite generic terms into something vivid and concrete

---

### ⚠️ rules

- only rename `.term` and `.slug` fields
- don’t invent new resources or behaviors — stick to what’s already in `sofar`
- keep names grounded in real-world observables
- prefer `noun-noun` or `verb-object` format

---

### 🔁 top priority: shared term overlap

**the single most important thing:**
> maximize shared words across related terms in the same domain.

- aim for **prefix matches** (e.g. `itemsStocked` ⟷ `itemsOrderable`)
- aim for **suffix matches** (e.g. `openInvoice` ⟷ `closeInvoice`)
- aim for **both matches** (e.g. `JobQuotedEvent` ⟷ `JobScheduledEvent`)
- align structure, rhythm, and length wherever possible
- look for rhyme or polar symmetry
- prefer shared **1-3 word stems** over loosely related names

---------------------------------------------------------


sofar =
```
$.rhachet{inflight}
```

