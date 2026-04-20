# self-review r10: has-consistent-conventions

deep search for emoji conventions. found extant coconut usage.

---

## extant coconut usage

**search:** `coconut|🥥` in src/
**found:** 21 files, primarily in git.release/

**key find:** git.release/output.sh line 110-111:
```bash
print_watch_header() {
  echo "   └─ 🥥 let's watch"
}
```

**semantic:** coconut 🥥 is used for "helpful information" / "watch" context.

---

## blueprint coconut usage

**proposed:** `print_coconut_hint()` with `🥥 did you know?`

**alignment with extant:**
- extant: `🥥 let's watch` — informational header
- proposed: `🥥 did you know?` — informational hint

**verdict:** holds — same semantic category (helpful info section)

---

## emoji taxonomy in codebase

| emoji | semantic | examples |
|-------|----------|----------|
| 🐢 | header/vibe | turtle vibes |
| 🐚 | shell/command | rmsafe, cpsafe |
| 🥥 | helpful info | watch, hints |
| 🌴 | automerge | git.release |
| 🌊 | release | git.release |
| 🫧 | transition | git.release |
| 👌 | success | checks passed |
| ⚓ | failure | checks failed |

**blueprint fits:** 🥥 for "did you know?" hint is consistent with extant semantic.

---

## found issues

none — coconut usage aligns with extant semantic.

---

## non-issues (why they hold)

| concern | why it holds |
|---------|--------------|
| coconut semantic | matches extant "helpful info" usage |
| emoji taxonomy | follows established patterns |
| hint phrase | "did you know?" is informational like "let's watch" |

---

## conclusion

r10 confirms blueprint follows extant emoji conventions. coconut 🥥 is appropriate for helpful informational sections, consistent with git.release usage.
