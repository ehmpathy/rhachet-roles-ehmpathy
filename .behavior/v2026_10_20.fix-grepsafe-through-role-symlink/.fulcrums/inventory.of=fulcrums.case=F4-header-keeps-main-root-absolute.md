# F4 — the header keeps a main-checkout root absolute

- fork: (a) leave `print_grepsafe_header` as is; (b) strip `REPO_ROOT` only from a root under it
- taken: (b). under (a), once rule 2 admits a main-checkout root, the header strips the first `/`
  and prints an absolute path as if relative (`tmp/…/.agent/…`), which misnames where the search
  ran. found by the clamp's snapshot, not prescribed by the vision
- rework: clean — drop one `if` around the extant strip
- confidence: 90% — the only question is whether the wisher wants it in this PR or its own
- where: grepsafe.sh `print_grepsafe_header`
