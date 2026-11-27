# F14 — the published history brief cites route refs

- **the fork**: (a) `ref.invariant.history` carries the full citation (with doi) per row, plus a `ref` slug that names its evidence file under this route's `refs/`; (b) the evidence files move into `src/` beside the brief; (c) citations only, no evidence pointer.
- **taken**: (a).
- **why at the time**: the wisher asked to stick the citations into route refs and cite them. the doi in each row lets the brief stand alone once the route is archived; the slug lets a reviewer reach the verbatim quote today.
- **rework**: clean — (b) is a move of 41 small files and one path line.
- **confidence**: 70%. a published brief that names a route path may read odd after the route closes.
- **where**: `src/domain.roles/architect/briefs/practices/domain.constraints/ref.invariant.history.md` · `$route/refs/`
- **verdict**: **skepticized (2026-11-23), confident** — (a) stands, as the wisher asked: *"stick them into route refs"* and *"cite them"*. each row carries its full citation, so the brief stands alone once the route is archived. 85%
