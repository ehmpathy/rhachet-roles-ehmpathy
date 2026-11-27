# F25 — the raw citation fetches stay in the route's `refs/.raw/` as provenance

- **the fork**: r11 (i005) nitpick.5 flags the route's `refs/.raw/` (182 files: crossref json and page fetches) as a scope leak and asks to gitignore them; its other half, the `playwright` and `rhachet-roles-bhrowser` devDeps, is F22. (a) keep the fetches tracked beside the refs they back; (b) gitignore them; (c) delete them once the refs are written.
- **taken**: (a).
- **why**:
  - the wisher asked for full citations fetched through the bhrowser, not from a web search, and kept in route refs. each `refs/ref.*.md` quotes its source; the `.raw/` fetch is the bytes that quote came from, so a reviewer can check a doi, a page, or a title without a second fetch behind a botwall
  - the files sit under `.behavior/`, which no build copies to `dist/`, so no consumer of the package receives them
  - a gitignore would leave every clone of this route with refs whose evidence cannot be reopened
- **rework**: clean — one `.gitignore` line, or one `rmsafe`, if the human prefers lean history.
- **confidence**: 70%. the residual: ≈ 20k lines of fetched text is heavy for a pr diff; the human may prefer (b) and a re-fetch on demand.
- **where**: `$route/refs/.raw/`; `5.1.execution.from_vision` review i005, r11 nitpick.5
- **verdict**: **ruled by the wisher (chat, 2026-11-24)**: the raw fetches stay tracked in the route — *"keep the raw citations in route"*
