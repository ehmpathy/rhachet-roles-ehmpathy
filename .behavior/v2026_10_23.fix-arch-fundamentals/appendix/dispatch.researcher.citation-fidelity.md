## .what

a researcher brief on citation fidelity, the peer of `rule.forbid.websearch-and-webfetch`: that rule says the words must come from bhrowser; this one says **cite only what the capture shows, and grade each citation by what it holds**.

## .the lessons — from one citation round, 2026-11-26

at `ehmpathy/rhachet-roles-ehmpathy` @ `vlad/fix-arch-fundamentals`, route `v2026_10_23.fix-arch-fundamentals/refs/`:

1. **cite only what the capture shows.** a stripe blog capture held no author and no date; the ref cites neither, though memory offered both. a field filled from memory is a fabricated citation that reads as a fetched one
2. **grade by content, two levels apart** — ✅ a verbatim quote from the publisher's own page · ☑️ metadata only (title, doi, venue, pages). a ☑️ origin never carries a quote
3. **a paywalled origin: crossref for the metadata, an open source that converges for the words.** gray 1978 (two-phase commit) and härder & reuter 1983 (acid) are cited by title via crossref; the quote each member carries comes from an open primary that argues the same (helland 2016, the postgresql docs)
4. **a publisher page is metadata, not text.** the acm dl page for doi:10.1145/289.291 cleared its bot wall and held zero of the four acid terms — the coinage sits inside the paywalled paper. a cleared wall is not a captured quote
5. **name the raw record per ref** (`seen: .raw/<id>.json — fetched <date> by <play>`), so each quote traces to what the browser saw
6. **a verbatim quote trips local term hooks** (gerunds, banned terms in titles and urls). retry unchanged; never paraphrase a quote to pass a hook
7. **a draft is graded as a draft** — the ietf idempotency-key header is draft-09, cited as an internet-draft, never as an rfc

## .shape

`rule.require.cite-only-what-the-capture-shows` (or a fold into `rule.forbid.websearch-and-webfetch`), with the ✅ / ☑️ grade table and the paywall cure. blocker: a citation field absent from the raw capture; a quote on a ☑️ ref.

companion: ehmpathy/rhachet-roles-bhrowser#43 (the stock source-fetch playbook these refs came from).
