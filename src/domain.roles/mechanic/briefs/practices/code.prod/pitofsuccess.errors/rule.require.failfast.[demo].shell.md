
can failfast via MalfunctionError && ConstraintError in shell too

glyph + class per rule.require.qualified-error-headers; each error goes to stdout and stderr

```sh
# reject absent input — the caller fixes it
if [[ -z "$SPOT" ]]; then
  {
    echo "✋ ConstraintError: --spot is required"
    echo ""
    echo "🥥 did you know?"
    echo "   └─ surfreport --spot pipeline"
  } | tee /dev/stderr
  exit 2
fi

# find the spot's wave reports; with nullglob, the glob yields zero, one, or many
shopt -s nullglob
REPORTS=("$STATE_DIR"/wave-report-"$SPOT"-*.json)

# halt on a state the fetcher should never leave — the system fixes it
if [[ ${#REPORTS[@]} -eq 0 ]]; then
  echo "💥 MalfunctionError: no wave report found for spot $SPOT" | tee /dev/stderr
  exit 1
fi
if [[ ${#REPORTS[@]} -gt 1 ]]; then
  echo "💥 MalfunctionError: ${#REPORTS[@]} wave reports found for spot $SPOT: ${REPORTS[*]}" | tee /dev/stderr
  exit 1
fi

REPORT="${REPORTS[0]}"
echo "• wave report: $REPORT"
```
