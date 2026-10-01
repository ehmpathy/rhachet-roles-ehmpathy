# F8 · why two engines at all?

- **rework**: clean (code) · dirty (round scope)
- **status**: 🔴 ruled 2026-09-08 — fold it in. my out-of-scope call reversed
- **confidence**: 85% → overruled

## .the observation

grepsafe ran two engines that disagreed four ways (case=5):

| # | divergence |
|---|-----------|
| 1 | glob semantics — path vs basename |
| 2 | gitignore honored |
| 3 | hidden paths skipped |
| 4 | regex dialect — Rust regex vs POSIX ERE, never closable |

Claude Code vendors ripgrep, so on the boxes grepsafe runs on, `rg` is present. the reporter's `rg`
resolved only as a zsh alias, invisible to `bash`. the defect chain:

1. `command -v rg` failed to see a present ripgrep
2. the fallback ran
3. the fallback disagreed with `rg` about globs

step 1 is a detection defect, not an absence. find ripgrep properly and drop the fallback, and all
four divergences dissolve at once.

## .my call, and why it lost

out of scope: the wish forbids a redesign twice. i priced that read at 85%. the question was never
*"what does the wish say?"* but *"is the wish's bound the right bound?"* — and only the wisher can
answer that.

## .the verdict

**fold it in.** one engine wherever `rg` exists.

- the `engine:` line (F1) stays, as provenance rather than a divergence diagnostic
- it forced F9: what happens on a box with no `rg` at all

## .where

- `1.vision.experience.case=5.engine-provenance.md`
- `inventory.of=fulcrums.case=F9-no-rg-on-the-box.md`
