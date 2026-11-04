# F16 — a push spends no use, and proceeds on a held grant at 0 left

- **fork** — (a) a push spends a commit use · (b) a push spends none but needs uses left · (c) a push spends none and proceeds on any held grant, even at 0; only `block` / `del` revoke
- **taken** — (c). the commander's "commit + push quota" leaves open whether push draws on the quota. (a) makes one commit + one push cost 2 — a crew with quota 1 strands its commit. (b) strands the commit that spent the last use, the exact bite `git.commit.push.sh:722` causes today. (c) lets the crew push what it made; a human who wants push gone types `block`
- **rework** — clean. the push check is one predicate (`held` vs `live`)
- **confidence** — 75%. low because "quota" could be read to span push too
- **where** — yield contract · `case=5` · `case=9` [t3] · `case=13` [t2] · inventory 1.10, 2.3, X8
- **verdict** — open, for the commander
