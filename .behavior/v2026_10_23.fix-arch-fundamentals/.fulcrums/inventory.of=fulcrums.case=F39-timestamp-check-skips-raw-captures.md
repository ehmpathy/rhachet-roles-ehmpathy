# F39 — the timestamp check skips a route's raw citation captures

- **the fork**: `.husky/check.timestamps.sh` refused the commit on `refs/.raw/` (arxiv submission dates, crossref index times). (a) exempt `.behavior/*/refs/.raw/*` in the check; (b) mask the stamps inside each capture; (c) drop the captures from the commit.
- **taken**: (a).
- **why**: the check guards against permadrift — a stamp that changes each run. a raw capture is a verbatim fetch, written once and never regenerated, so it cannot drift. (b) edits provenance, which then no longer matches its source; (c) reverses F25 (kept in route).
- **rework**: clean — one `case` in the check.
- **confidence**: 85%. the residual: the check now trusts a path, not content; a regenerated file placed under `refs/.raw/` would pass unchecked.
- **where**: `.husky/check.timestamps.sh`; the one authored hit, the surf-school example of the banned status term, now reads `slot.startsAt` with no literal
- **verdict**: open
