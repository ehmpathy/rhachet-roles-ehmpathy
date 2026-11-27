# ref.1985.abelson-sussman

grade: ✅ (the publisher's full text, read in the browser). the full text is the 2nd edition (1996); the chapter titles match the 1st (1985)
cite: Harold Abelson, Gerald Jay Sussman, with Julie Sussman (1985; 2nd ed. 1996). Structure and Interpretation of Computer Programs. MIT Press. https://mitp-content-server.mit.edu/books/content/sectbyfn/books_pres_0/6515/sicp.zip/full-text/book/book.html
seen: `.raw/page.sicp-ch1.json` · `.raw/page.sicp-ch2.json` · `.raw/page.sicp-2.1.json` · `.raw/abelsonsussman1985.crossref.json` (a 1985 review record confirms the year and the authors)

## .quote

chapter titles: "Chapter 1 Building Abstractions with Procedures" · "Chapter 2 Building Abstractions with Data"

> "The general technique of isolating the parts of a program that deal with how data objects are represented from the parts of a program that deal with how data objects are used is a powerful design methodology called data abstraction." (ch. 2 intro)

> "The horizontal lines represent abstraction barriers that isolate different ``levels'' of the system. At each level, the barrier separates the programs (above) that use the data abstraction from the programs (below) that implement the data abstraction." (§2.1.2)

> "In effect, procedures at each level are the interfaces that define the abstraction barriers and connect the different levels." (§2.1.2)

> "the underlying idea of data abstraction is to identify for each type of data object a basic set of operations in terms of which all manipulations of data objects of that type will be expressed, and then to use only those operations in manipulating the data." (§2.1.2)

## .supports

- `define.abstraction._`: the two kinds — over procedures (a contract) and over data (a construct)
- `tactic=barrier`: callers above a barrier use only the operations it offers; what lies below can change
