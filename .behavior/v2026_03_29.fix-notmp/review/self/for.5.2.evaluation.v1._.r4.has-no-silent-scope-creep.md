# review: has-no-silent-scope-creep (r4)

## approach

examined full git diff to identify any changes not part of the /tmp behavior (v2026_03_29.fix-notmp).

## git diff analysis

```
git diff --name-only origin/main
```

total files changed: 155

### categorization of changes

#### category 1: this behavior (v2026_03_29.fix-notmp)

| file | purpose |
|------|---------|
| pretooluse.forbid-tmp-writes.sh | hook implementation |
| pretooluse.forbid-tmp-writes.integration.test.ts | hook tests |
| __snapshots__/pretooluse.forbid-tmp-writes.integration.test.ts.snap | test snapshot |
| getMechanicRole.ts | hook registration |
| .behavior/v2026_03_29.fix-notmp/* | behavior route files |

these are the only files claimed by the evaluation document.

#### category 2: other behavior (v2026_03_26.fix-sedreplace-allow)

| file | purpose |
|------|---------|
| pretooluse.forbid-sedreplace-special-chars.sh | different hook |
| pretooluse.forbid-sedreplace-special-chars.integration.test.ts | different hook tests |
| sedreplace.sh | skill changes |
| sedreplace.integration.test.ts | skill tests |
| .behavior/v2026_03_26.fix-sedreplace-allow/* | different behavior route |

these are from a separate behavior worked on concurrently. not scope creep - properly separate.

#### category 3: shared infrastructure

| file | purpose |
|------|---------|
| init.claude.permissions.jsonc | shared permission config |
| getMechanicRole.test.ts | role test file |
| .claude/settings.json | auto-generated |
| package.json, pnpm-lock.yaml | dependencies |

these are touched by both behaviors but are shared infrastructure.

#### category 4: briefs and documentation

| file | purpose |
|------|---------|
| .agent/repo=.this/role=any/briefs/* | internal briefs |
| rule.prefer.sedreplace-for-renames.md | mechanic brief |

these are documentation added alongside work but not claimed by this behavior.

## scope creep check

### question 1: did you add features not in the blueprint?

| feature | in blueprint? | verdict |
|---------|---------------|---------|
| hook implementation | yes | not creep |
| hook tests (38) | yes (37 + snapshot) | not creep |
| hook registration | yes | not creep |
| snapshot file | implicit (jest pattern) | not creep |

no features added beyond blueprint.

### question 2: did you change things "while you were in there"?

| change | related to wish? | verdict |
|--------|------------------|---------|
| getMechanicRole.ts | yes (hook registration) | not creep |
| init.claude.permissions.jsonc | analysis determined no change needed | not creep |

no opportunistic changes made.

### question 3: did you refactor code unrelated to the wish?

| refactor | related to wish? | verdict |
|----------|------------------|---------|
| none | N/A | not creep |

no refactors made.

## verification: evaluation document scope

the evaluation document (5.2.evaluation.v1.i1.md) claims only:
- pretooluse.forbid-tmp-writes.sh (112 lines)
- pretooluse.forbid-tmp-writes.integration.test.ts (396 lines)
- __snapshots__/*.snap (13 lines)
- getMechanicRole.ts (6 lines added)
- init.claude.permissions.jsonc (retained, no changes)

this matches the files in category 1 above. no files from categories 2-4 are claimed.

## deep verification: getMechanicRole.ts diff analysis

```sh
git diff origin/main -- src/domain.roles/mechanic/getMechanicRole.ts
```

the diff shows TWO changes:

### change 1: lines removed (-6 lines)

```diff
-        {
-          command:
-            './node_modules/.bin/rhachet run --repo ehmpathy --role mechanic --init claude.hooks/pretooluse.forbid-sedreplace-special-chars',
-          timeout: 'PT5S',
-          filter: { what: 'Bash', when: 'before' },
-        },
```

this is the sedreplace-special-chars hook removal. part of v2026_03_26.fix-sedreplace-allow behavior. NOT part of this behavior.

### change 2: lines added (+6 lines)

```diff
+        {
+          command:
+            './node_modules/.bin/rhachet run --repo ehmpathy --role mechanic --init claude.hooks/pretooluse.forbid-tmp-writes',
+          timeout: 'PT5S',
+          filter: { what: 'Write|Edit|Bash', when: 'before' },
+        },
```

this is the tmp-writes hook addition. part of THIS behavior (v2026_03_29.fix-notmp).

### analysis

the evaluation document claims "getMechanicRole.ts (6 lines added)". this is accurate:
- the 6 lines ADDED are for pretooluse.forbid-tmp-writes (this behavior)
- the 6 lines REMOVED are for pretooluse.forbid-sedreplace-special-chars (other behavior)

the evaluation correctly scopes its claim to only the addition. the removal is documented by its own behavior route.

## scope creep verdict

| change | claimed by this behavior? | scope creep? |
|--------|---------------------------|--------------|
| pretooluse.forbid-tmp-writes hook (+6 lines) | yes | no |
| pretooluse.forbid-sedreplace-special-chars hook (-6 lines) | no (other behavior) | no |

no scope creep. each change is traceable to its respective behavior.

## why it holds

1. **no scope creep**: evaluation claims only the +6 lines for tmp-writes hook
2. **concurrent work properly separated**: sedreplace removal is in a separate behavior route
3. **no opportunistic changes**: no "while I was in there" modifications
4. **no unrelated refactors**: code touched only for the stated purpose
5. **verified at diff level**: actual git diff matches evaluation claims

all changes in the evaluation document are traceable to the wish.

