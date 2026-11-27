# ref.2023.rfc9413

grade: ✅ (the rfc editor's own page; on the page: "Stream: Internet Architecture Board (IAB) … Category: Informational Published: June 2023 … Authors: M. Thomson D. Schinazi")
cite: M. Thomson, D. Schinazi (2023, june). RFC 9413: Maintaining Robust Protocols. IAB, Informational. https://www.rfc-editor.org/rfc/rfc9413.html
seen: `.raw/page.rfc9413.json` · `.raw/page.rfc9413-date.json`

## .quote

> "A flaw can become entrenched as a de facto standard. Any implementation of the protocol is required to replicate the aberrant behavior, or it is not interoperable."

> "Ultimately, the need to interoperate with deployed implementations is a de facto conformance test suite that can supersede any formal protocol definition."

## .supports

- contrast to "only the declared guarantee binds": deployed behavior can supersede the written spec
- the response (bound): mark what is unpromised, and prove each guarantee with a blackbox acceptance test, so the declared surface and the observed surface stay close
