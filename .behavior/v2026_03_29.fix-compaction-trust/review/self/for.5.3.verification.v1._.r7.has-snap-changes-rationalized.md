# self-review r7: has-snap-changes-rationalized

## question

is every `.snap` file change intentional and justified?

## analysis

### snap files in git diff

| file | status | part of this behavior? |
|------|--------|------------------------|
| `git.release.p3.scenes.on_main.into_prod.integration.test.ts.snap` | modified (unstaged) | **no** |

### analysis of the unrelated snap change

the snap file `git.release.p3.scenes.on_main.into_prod.integration.test.ts.snap` has extra "watch" lines added:

```diff
+      ├─ 💤 publish.yml, Xs in action, Xs watched
+      ├─ 💤 publish.yml, Xs in action, Xs watched
... (37+ lines)
```

this change is:
- **unrelated to trust-but-verify behavior** — it's in git.release skill
- **unstaged** — not part of what will be committed
- **likely a test time artifact** — extra poll cycles in the watch mock

### action taken

this snap file change will NOT be included in the commit:
- it is unstaged
- it is unrelated to this behavior
- it should be addressed in a separate git.release fix if needed

### snap files created by this behavior

| file | created? |
|------|----------|
| postcompact.trust-but-verify.integration.test.ts.snap | **no** — uses `toContain` assertions |

## why it holds

this behavior created no snap files. the one snap file with unstaged changes is unrelated to trust-but-verify and will not be committed. the current behavior uses `toContain` assertions instead of snapshots because the hook output is static heredoc text.

