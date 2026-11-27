#!/usr/bin/env bash
######################################################################
# .what = extract the text of a pdf in this repo, into a sibling .txt
#
# .why  = a citation fetch saves a paper as raw pdf bytes; a quote is
#         verified only by a grep over its text. this is the one paved
#         path from pdf to text, so no clone hand-runs pdftotext
#
# usage:
#   pdf.text.sh --from refs/.raw/paper.pdf                  # writes refs/.raw/paper.pdf.txt
#   pdf.text.sh --from refs/.raw/paper.pdf --into out.txt   # explicit target
#
# guarantee:
#   - both paths lie inside the repo, else exit 2
#   - --from must be a pdf (magic bytes %PDF-), else exit 2
#   - keeps the page layout (pdftotext -layout), so columns stay apart
#   - overwrites the target: the text is derived, the pdf is the source
#   - exit 0 = written, 1 = malfunction (pdftotext absent or failed), 2 = bad input
######################################################################
set -euo pipefail

# print an error block to stdout and to stderr (rule.require.skill-output-streams)
emit_error() {
  local block="$1"
  echo "$block"
  echo "$block" >&2
}

FROM=""
INTO=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skill|--repo|--role) shift 2 ;; # forwarded by rhx; not ours
    --from) FROM="$2"; shift 2 ;;
    --into) INTO="$2"; shift 2 ;;
    --help|-h)
      sed -n '3,19p' "$0"
      exit 0
      ;;
    *)
      emit_error "$(printf '✋ ConstraintError: unknown arg %s\n   └─ see: rhx pdf.text --help' "$1")"
      exit 2
      ;;
  esac
done

# reject absent --from
if [[ -z "$FROM" ]]; then
  emit_error "$(printf '✋ ConstraintError: --from is required\n   └─ usage: rhx pdf.text --from <path.pdf> [--into <path.txt>]')"
  exit 2
fi
[[ -z "$INTO" ]] && INTO="${FROM}.txt"

# reject paths outside the repo
REPO_ROOT="$(git rev-parse --show-toplevel)"
FROM_ABS="$(realpath -m "$FROM")"
INTO_ABS="$(realpath -m "$INTO")"
for P in "$FROM_ABS" "$INTO_ABS"; do
  if [[ "$P" != "$REPO_ROOT"/* ]]; then
    emit_error "$(printf '✋ ConstraintError: path outside the repo\n   └─ path: %s' "$P")"
    exit 2
  fi
done

# reject a file that is absent or not a pdf
if [[ ! -f "$FROM_ABS" ]] || [[ "$(head -c 5 "$FROM_ABS")" != "%PDF-" ]]; then
  emit_error "$(printf '✋ ConstraintError: --from is not a pdf\n   └─ path: %s' "$FROM")"
  exit 2
fi

# fail loud if the extractor is absent
if ! command -v pdftotext >/dev/null; then
  emit_error "$(printf '💥 MalfunctionError: pdftotext not found\n   └─ fix: sudo apt install poppler-utils')"
  exit 1
fi

# extract
pdftotext -layout "$FROM_ABS" "$INTO_ABS"

echo "🐢 righteous"
echo ""
echo "🐚 pdf.text"
echo "   ├─ from: $FROM"
echo "   ├─ into: $INTO"
echo "   ├─ lines: $(wc -l < "$INTO_ABS")"
echo "   └─ chars: $(wc -c < "$INTO_ABS")"
