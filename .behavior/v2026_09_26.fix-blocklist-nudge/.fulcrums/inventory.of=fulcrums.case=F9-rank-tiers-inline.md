# F9 — the rank tiers stay inline in get_ranked_hits

- **fork:** split each tier (shared lead, typo, fzf, segment, shared tokens) into its own bash
  function, vs keep them as documented paragraphs in one loop.
- **taken:** inline. the loop runs once per allowlist pattern (~200) per part. a bash function call
  per tier per pattern multiplies call overhead by ~5, and case23 bounds a full hook run at 3s — it
  already took 4.2s once and needed a pass of optimization to fit.
- **what keeps it legible:** the `.tiers` header names every tier and its score; each tier is one
  commented paragraph; every tier has its own test case (case30–33, case37).
- **rework:** clean — the tiers are paragraphs with no shared locals beyond the score, so a split is
  a mechanical move if a later measurement shows the overhead is affordable.
- **confidence:** 70% — the overhead estimate is reasoned, not measured.
- **where:** `pretooluse.check-permissions.sh`, `get_ranked_hits`.
- **verdict:** —
