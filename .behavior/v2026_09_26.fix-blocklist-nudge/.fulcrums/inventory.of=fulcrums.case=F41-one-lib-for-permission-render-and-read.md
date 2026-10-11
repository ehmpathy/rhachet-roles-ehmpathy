# F41 — one lib holds the permission render and the allowlist read

## .the fork

- **split now:** a generic render lib (`print_framed`, `print_to_both`, `render_tree_entries`)
  plus a permissions lib (`BASH_PATTERNS_FILTER`, `get_claude_dir`, the pattern head, the marker
  key)
- **hold:** one `_permissions.render.lib.sh`, sourced by the four permission surfaces

raised by peer review i014 (enroll-impl-arch-defects, nitpick.3, graded `better`).

## .taken — hold, and why at the time

- every consumer of the generic half today is a permission surface (the hook, the notice, and the
  two skills); no other hook sources it, so a split serves a reader that does not exist yet
  (rule.prefer.wet-over-dry, rule.prefer.most-common-denominator: lift on proven reuse)
- the lib's name says where it lives, not who may read it; the first non-permission consumer is
  the moment to lift the frame + tree half into a generic lib, at the cost of one `source` line
- the duplicated head logic the same review raised (nitpick.2) is lifted into this lib now, so
  each of its operations has one home

## .rework

**clean** — a file split and one more `source` line per caller; no behavior moves.

## .confidence — 85%

## .where

`src/domain.roles/mechanic/inits/claude.hooks/_permissions.render.lib.sh`
