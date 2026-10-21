# F4 — release grant is a quota; one use per apply

- **fork** — `allow`/`block` only · or `--quant N` with `allow` = unlimited
- **taken** — a quota. a release is a discrete, high-stake act; a human stamp of "ship this one" maps to `--quant 1`, and it self-revokes after. `git.release --into prod --mode apply` (feat → main → prod) spends one use: it is one ship, in the human's words
- **rework** — clean
- **confidence** — 75%. a `--retry` of failed workflows, and a second apply after a ci fix, may each want to spend zero
- **where** — `case=1` [t6] · `case=2` [t0]
- **verdict** — open
