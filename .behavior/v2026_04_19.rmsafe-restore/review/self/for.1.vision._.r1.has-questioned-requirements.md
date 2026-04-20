# self-review: has-questioned-requirements

## requirements questioned

### 1. "copy to trash before delete"

**who said?** wish.md — the wisher
**why?** enable restore of accidentally deleted files
**what if we didn't?** users would need git checkout or lose work
**evidence?** common pattern (desktop trash, IDE local history)
**simpler?** no — this is the minimal implementation of the goal
**verdict:** holds — core requirement, well-justified

### 2. "trash path at `.agent/.cache/repo=ehmpathy/role=mechanic/skill=rmsafe/trash/`"

**who said?** wish.md — the wisher specified this exact path
**why?** follows repo's cache conventions
**what if we didn't?** could use simpler path like `.trash/`
**evidence?** cache path keeps it grouped with other mechanic caches
**simpler?** `.trash/` would be shorter, but breaks convention
**verdict:** holds — wisher's explicit requirement, follows conventions

### 3. "gitignore the trash dir"

**who said?** wish.md
**why?** trash shouldn't pollute git status or commits
**what if we didn't?** deleted files would show as "new" in trash, unclear status
**evidence?** obvious UX requirement
**simpler?** no — essential
**verdict:** holds — non-negotiable

### 4. "findsert gitignore on mkdir"

**who said?** wish.md
**why?** ensures gitignore extant whenever trash dir extant
**what if we didn't?** trash might accidentally get committed
**evidence?** defensive pattern for cache dirs
**simpler?** no — one-liner addition
**verdict:** holds — low cost, high value

### 5. "output restore command"

**who said?** wish.md — "express how one can restore"
**why?** discoverability — user learns they can restore
**what if we didn't?** users wouldn't know trash extant
**evidence?** good UX — tell users their options
**simpler?** no — essential for the feature to be useful
**verdict:** holds — core UX requirement

### 6. "use cpsafe for restore"

**who said?** wish.md — "(i.e., cpsafe out of the trash cache)"
**why?** reuse extant tools, no new commands
**what if we didn't?** could add `rmsafe --restore`
**evidence?** cpsafe already extant and works
**simpler?** yes — cpsafe reuse is simpler than new command
**verdict:** holds — but noted as potential future enhancement

## requirements NOT in wish but added in vision

### 7. "timestamped trash (open question)"

**who said?** I added this as an open question
**why?** handles "delete same file twice" edgecase
**what if we didn't?** simpler implementation, last version wins
**evidence?** desktop trash systems do this
**simpler?** NOT this is simpler
**verdict:** flagged for wisher — explicitly called out as question, not assumed

### 8. "auto-cleanup (open question)"

**who said?** I added this as an open question
**why?** prevents unbounded disk usage
**what if we didn't?** simpler, manual cleanup via rmsafe -r
**evidence?** nice-to-have, not essential
**simpler?** NOT this is simpler
**verdict:** flagged for wisher — correctly left as question

## conclusion

all requirements from the wish are justified. the vision correctly identifies scope creep risks (timestamps, auto-cleanup) and flags them as open questions rather than assumptions. no bloat detected.
