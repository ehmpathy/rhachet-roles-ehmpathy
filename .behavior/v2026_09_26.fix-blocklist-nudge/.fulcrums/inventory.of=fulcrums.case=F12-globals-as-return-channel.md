# F12 — bash procedures return via named globals

- **fork:** pass part words into each procedure / return via `local -n` out-vars, vs return via
  named globals (`PART_WORDS`, `RANK_HITS`, `INVENTORY_HEAD`) set by one composer.
- **taken:** named globals. bash functions cannot return arrays; the alternatives are a
  subshell (a fork per call, against case23's 3s bound) or `local -n` namerefs (bash ≥ 4.3, and a
  nameref that shadows a local of the same name fails silently). each global is documented at
  its setter (`.note = sets the global …`), and one composer (`set_blocked_part_row`) calls the
  three in their fixed order.
- **the reach is wider than the rank trio.** `SETTINGS_MALFUNCTION`, `INVENTORY_MALFUNCTION`, and
  `RECORD_MALFUNCTION` are set early and read at the render tail; `FRESH_HITS` and `BLOCK_HEADER`
  likewise. each has one writer site and one reader site, and each is noted at its setter.
- **rework:** clean — each global has one writer and one reader.
- **confidence:** 75%.
- **where:** `as_part_words`, `get_inventory_head`, `get_ranked_hits`, `set_blocked_part_row`.
- **verdict:** —
