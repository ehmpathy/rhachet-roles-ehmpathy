# self-review: has-pruned-yagni

## code changes reviewed

### change 1: `LITERAL=false` variable

```bash
FROM=""
INTO=""
+LITERAL=false
```

**was this requested?** Yes - vision specifies `--literal` flag.
**minimum viable?** Yes - single boolean, no state object or config.
**verdict: HOLDS** - necessary to track flag state.

### change 2: `--literal|-l` flag parse

```bash
+    --literal|-l)
+      LITERAL=true
+      shift
+      ;;
```

**was this requested?** Yes - vision specifies the flag.
**minimum viable?** Yes - simple case statement, standard pattern.
**note:** `-l` short form follows CLI convention. Exception: globsafe uses `-l` for `--long`, so no conflict there.
**verdict: HOLDS**

### change 3: `--help|-h` handler

```bash
+    --help|-h)
+      echo "usage: ..."
+      echo "examples:"
+      echo "  mvsafe.sh --literal 'file.[ref].md' ..."
+      echo "  mvsafe.sh 'file.\\[ref\\].md' ..."
```

**was this requested?** Yes - vision says "update skill help (`--help` output)".
**minimum viable?** Yes - just echo statements, no help framework.
**verdict: HOLDS**

### change 4: glob detection bypass

```bash
-IS_GLOB=$(is_glob_pattern "$FROM" && echo "true" || echo "false")
+if [[ "$LITERAL" == true ]]; then
+  IS_GLOB=false
+else
+  IS_GLOB=$(is_glob_pattern "$FROM" && echo "true" || echo "false")
+fi
```

**was this requested?** Yes - vision says "skip glob detection when `--literal` is set".
**minimum viable?** Yes - simple conditional, no abstraction.
**verdict: HOLDS**

### change 5: "did you know?" hint

```bash
+  if [[ "$LITERAL" != true && "$FROM" == *"["* ]]; then
+    FROM_ESCAPED="${FROM//\[/\\[}"
+    FROM_ESCAPED="${FROM_ESCAPED//\]/\\]}"
+    echo ""
+    echo "🥥 did you know?"
+    echo "   ├─ path contains \`[\` ..."
```

**was this requested?** Yes - explicitly in vision with exact coconut emoji and treestruct format.
**minimum viable?** Yes - only triggers on specific condition (crickets + bracket + no literal flag).
**verdict: HOLDS**

### change 6: header comment update

```bash
+#   mvsafe.sh --literal 'file.[ref].md' 'dest.[ref].md'      # literal brackets
+#   mvsafe.sh 'file.\[ref\].md' 'dest.\[ref\].md'            # escaped brackets
```

**was this requested?** Yes - vision says "update skill header with `--literal` examples".
**minimum viable?** Yes - two example lines, matches extant style.
**verdict: HOLDS**

## same pattern in rmsafe, cpsafe, globsafe

all four skills follow identical pattern:
1. add `LITERAL=false` variable
2. add `--literal` flag parse
3. add/update `--help` output
4. bypass glob detection when literal
5. add "did you know?" hint in crickets output
6. update header comments

**globsafe difference:** uses character class escapes (`[[]`, `[]]`) instead of bypass, because it's inherently a glob tool.

## no YAGNI violations found

| component | requested | minimum viable |
|-----------|-----------|----------------|
| `LITERAL` variable | yes | yes |
| `--literal` flag | yes | yes |
| `-l` short form | convention | yes |
| `--help` output | yes | yes |
| glob bypass | yes | yes |
| "did you know?" hint | yes | yes |
| header comments | yes | yes |

no abstractions, no "future flexibility", no "while we're here" extras.
