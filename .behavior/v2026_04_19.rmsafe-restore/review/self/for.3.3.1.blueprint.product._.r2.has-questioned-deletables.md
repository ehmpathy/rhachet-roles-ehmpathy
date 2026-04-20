# self-review: has-questioned-deletables

tried to delete before optimize. questioned each component.

---

## features questioned

### feature: trash before rm

**traces to:** wish.md "first cp into trash dir"
**wisher asked?** yes — explicit in wish
**verdict:** keep — core requirement

### feature: .gitignore findsert

**traces to:** wish.md "that .trash/ dir should be gitignored"
**wisher asked?** yes — explicit in wish
**verdict:** keep — core requirement

### feature: coconut hint output

**traces to:** wish.md "express how one can restore"
**wisher asked?** yes — explicit in wish
**verdict:** keep — core requirement

### feature: ensure_trash_dir() function

**traces to:** wish.md "findserted on mkdir"
**wisher asked?** yes — implicit in wish
**could delete?** no — needed for mkdir + gitignore
**verdict:** keep — minimal implementation of requirement

### feature: print_coconut_hint() in output.sh

**traces to:** coconut output requirement
**could inline?** yes — could put echo directly in rmsafe.sh
**should inline?** no — output.sh pattern is reused across *safe commands
**verdict:** keep — follows extant pattern

---

## components questioned

### component: separate ensure_trash_dir()

**can remove?** could inline mkdir + gitignore
**if deleted, add back?** yes — cleaner abstraction
**simplest version?** inline is simpler but less readable
**verdict:** keep — single responsibility, easier to test

### component: cp -P flag

**can remove?** no — needed to preserve symlinks
**verdict:** keep — required for symlink behavior

### component: mirrored path structure

**can remove?** could flatten with encoded names
**if deleted, add back?** yes — mirrored is more intuitive
**verdict:** keep — vision decided this explicitly

---

## potential deletions considered

1. **separate trash validation** — could skip repo boundary check for trash (it's always within repo)
   **verdict:** delete — trash is always at $REPO_ROOT, no validation needed

2. **trash stats in output** — could add "trashed: N files" line
   **verdict:** don't add — not in vision, would be scope creep

---

## found issues

### issue: unnecessary trash validation

blueprint shows same boundary check for trash destination as for source.
but trash is always `$REPO_ROOT/.agent/...` — always within repo.

**how fixed:** remove redundant validation from blueprint. trash destination needs no check.

---

## summary

| component | keep/delete | reason |
|-----------|-------------|--------|
| trash before rm | keep | core requirement |
| gitignore findsert | keep | core requirement |
| coconut hint | keep | core requirement |
| ensure_trash_dir() | keep | clean abstraction |
| print_coconut_hint() | keep | follows pattern |
| cp -P flag | keep | symlink requirement |
| mirrored path | keep | vision decision |
| trash boundary check | delete | redundant |

one deletion identified: remove redundant trash boundary validation.
