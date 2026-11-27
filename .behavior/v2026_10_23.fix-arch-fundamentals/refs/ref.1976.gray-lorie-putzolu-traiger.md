# ref.1976.gray-lorie-putzolu-traiger

grade: ✅ for the quotes — the paper's own text (an author-hosted copy of the ibm research report, via jim gray's page); ☑️ for the venue of the 1976 print — it is not on the pdf, and the crossref record found is the companion vldb 1975 paper
cite: J. N. Gray, R. A. Lorie, G. R. Putzolu & I. L. Traiger. "Granularity of Locks and Degrees of Consistency in a Shared Data Base." IBM Research Laboratory, San Jose, California. author-hosted report (file name `…rj 1654.pdf`). the first part of the work appeared as J. N. Gray, R. A. Lorie & G. R. Putzolu (1975), "Granularity of locks in a shared data base," *Proceedings of the 1st International Conference on Very Large Data Bases (VLDB '75)*, p. 428, ACM Press, doi:10.1145/1282480.1282513. not verified here: the 1976 print venue (the ifip working conference on modelling in data base management systems, north-holland) — recalled, not seen on a page.
seen: `.raw/pdf.gray1976-granularity-rj1654.pdf` (url `https://jimgray.azurewebsites.net/papers/granularity%20of%20locks%20and%20degrees%20of%20consistency%20rj%201654.pdf`, 1,357,852 bytes) · text via `rhx pdf.text` → `.raw/pdf.gray1976-granularity-rj1654.pdf.txt` · `.raw/gray1976.crossref.json` — fetched 2026-11-27 by `.playbooks/fetch-sources.play.ts`

## .quotes

the text layer is an ocr of a typescript scan; letters come spaced apart and a few are garbled. each quote below is the text layer with the spaces closed and the plain ocr slips (`r ~ a d` → read, `n a y` → may) corrected; the words are the paper's.

> "The choice of lockable units presents a tradeoff between concurrency and overhead, which is related to the size or granularity of the units themselves." (§ granularity of locks)

> "Share mode allows reading but not modification of the corresponding resource by the requestor and by other transactions. The semantics of exclusive mode is that the grantee may read and modify the resource and no other transaction may read or modify the resource while the exclusive lock is set. The reason for dichotomizing share and exclusive access is that several share requests can be granted concurrently (are compatible) whereas an exclusive request is not compatible with any other request."

> "We say that two lock requests for the same node by two different transaction are compatible if they can be granted concurrently. The mode of the request determines its compatibility with requests made by other transactions."

> abstract: "A locking protocol which allows simultaneous locking at various granularities by different transactions is presented. It is based on the introduction of additional lock modes besides the conventional share mode and exclusive mode."

## .supports

- exclusive vs pessimistic: "exclusive" and "share" are lock modes — what a granted lock lets the grantee and every other transaction do, and which requests it is compatible with. the paper calls share and exclusive "the conventional" modes. it names no strategy of "lock before use" versus "validate at commit"; that contrast is `ref.1981.kung-robinson` (optimistic) and `ref.2002.fowler` (pessimistic offline lock)
- an exclusive lock can be taken on a record, a file, or a whole database: the mode is independent of the granule it covers
