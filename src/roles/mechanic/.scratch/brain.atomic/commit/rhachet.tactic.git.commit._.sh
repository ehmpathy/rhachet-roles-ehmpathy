#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------------
# ------------------------------------------------------------------
# ------------------------------------------------------------------
# 🏡 init
# ------------------------------------------------------------------

# grab some facts about the environment
CURRENT_TIMESTAMP=$(date +%s)
CURRENT_FILEDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)" # resolve absolute directory of this script
CURRENT_FILENAME=$(basename "$0" .sh) # filename without extension

# build temp directory path under .rhachet/.temp/{currentFilename}/i{timestamp}
TEMP_DIR=".rhachet/.temp/${CURRENT_FILENAME}/i${CURRENT_TIMESTAMP}"

# ensure directory exists
mkdir -p "$TEMP_DIR"


# ------------------------------------------------------------------
# ------------------------------------------------------------------
# ------------------------------------------------------------------
# 🚜 prepare
# ------------------------------------------------------------------

# step1 = grab the git context
STEP1_P1_OUTPUT_CHOICE="${TEMP_DIR}/step1.git.context.overview.out";
$CURRENT_FILEDIR/rhachet.strat.git.commit.encontext.overview.sh > "$STEP1_P1_OUTPUT_CHOICE";
echo "💾 $STEP1_P1_OUTPUT_CHOICE";

STEP1_P2_OUTPUT_CHOICE="${TEMP_DIR}/step1.git.context.difference.out";
$CURRENT_FILEDIR/rhachet.strat.git.commit.encontext.difference.sh > "$STEP1_P2_OUTPUT_CHOICE";
echo "💾 $STEP1_P2_OUTPUT_CHOICE";


# ------------------------------------------------------------------
# ------------------------------------------------------------------
# ------------------------------------------------------------------
# 🌾 produce
# ------------------------------------------------------------------

# step 2.1 — summarize changes (commit message bullets)
STEP2_P1_ATTEMPTS=1; # it's bee consistent enough
STEP2_P1_OUTPUT_BASE="${TEMP_DIR}/step2.1.git.commit.message.md";
STEP2_P1_OUTPUT_CHOICE="${TEMP_DIR}/step2.1.git.commit.message.i1.md"; # default to first choice
ASK=$(cat <<'ASK_EOF'
summarize the changes that have been made
- in bullet point format

rules
- [must] get the context on current changes from referenced git.context.out files
ASK_EOF
)
npx rhachet ask -r bhrain -s instantiate \
  --attempts $STEP2_P1_ATTEMPTS \
  --output "$STEP2_P1_OUTPUT_BASE" \
  --references "$STEP1_P2_OUTPUT_CHOICE" \
  --ask "$ASK"
echo "💾 ${STEP2_P1_OUTPUT_CHOICE}"

# step 2.2 — propose conventional-commit command
STEP2_P2_OUTPUT_BASE="${TEMP_DIR}/step2.git.commit.plan.md"
ASK=$(cat <<'ASK_EOF'
draft a git commit command; focus on the commit message
- make sure it represents the purpose of the changes
- make sure it captures the high level effects of the changes
- use sub bullet points to capture sub details, as needed
- focus only on the latest changes reported in reference:git.commit.message

propose a git commit command with a git message that summarizes the current changes
- [must] use the referenced summary of changes to articulate the commit message
- [must] use the conventional-commits format; always choose either fix(*): or feat(*):; always add a scope
- [must] follow the conventions and terms seen in the past 21 commits and keep tone consistent

important:
- use reference:git.commit.context.overview ONLY as templates, to see examples of commit messages to be consistent with
- use reference:git.commit.message as the source of the commit message you'll write

critical:
- block the terms from your vocabulary: `script`
- scopes must be less than 11 char long; scopes should be reused when possible
- block "-ing" suffixed words from your vocabulary; avoid gerunds
- always use a feat or fix; never chore
ASK_EOF
)
npx rhachet ask -r commander -s plan \
  --attempts 3 \
  --ask "$ASK" \
  --output "$STEP2_P2_OUTPUT_BASE" \
  --references "$STEP2_P1_OUTPUT_CHOICE,$STEP1_P1_OUTPUT_CHOICE"
echo "💾 ${STEP2_P2_OUTPUT_BASE%.md}.i{1,2,3}.md"

# ------------------------------------------------------------------
# ------------------------------------------------------------------
# ------------------------------------------------------------------
# 🌡️ measure
# ------------------------------------------------------------------

choose_from_attempts() {
  local base="$1"   # e.g., /path/to/file.md
  local label="$2"  # e.g., "commit message"
  local glob="${base%.md}.i*.md"

  command -v fzf >/dev/null 2>&1 || {
    echo "❌ fzf is required for interactive selection. install fzf and rerun." >&2
    exit 1
  }

  mapfile -t options < <(ls -1 $glob 2>/dev/null || true)
  if [[ ${#options[@]} -eq 0 ]]; then
    echo "⚠️  no attempts found for ${label} at ${glob}" >&2
    exit 1
  fi

  echo
  echo "🌡️ measuring: ${label}"
  echo "🔎 ${glob}"
  echo

  # pick exactly one; interactive with preview
  local pick
  pick="$(
    printf '%s\0' "${options[@]}" \
    | fzf --read0 \
          --height=90% --layout=reverse --border --cycle \
          --prompt="choose ${label} > " \
          --bind "f3:toggle-preview" \
          --bind "alt-p:preview-page-up,alt-n:preview-page-down" \
          --preview 'sed -n "1,400p" {}' \
          --preview-window=right,70%:wrap
  )"

  [[ -n "${pick:-}" ]] || { echo "❌ no selection made."; exit 1; }

  echo "✅ selected: $(basename "$pick")"

  # persist the choice for downstream steps (release)
  local choice_id
  choice_id="$(basename "${base%.md}")"  # e.g., step2.1.git.commit.message
  local choice_path="${TEMP_DIR}/step3.choice.${choice_id}.path"
  local choice_copy="${TEMP_DIR}/step3.choice.${choice_id}.md"

  printf "%s\n" "$pick" > "$choice_path"
  cp "$pick" "$choice_copy"

  echo "💾 saved selection path → $choice_path"
  echo "💾 saved selection copy → $choice_copy"
}

# choose commit plan (from step2)
choose_from_attempts "$STEP2_P2_OUTPUT_BASE" "commit plan"

# ------------------------------------------------------------------
# ------------------------------------------------------------------
# ------------------------------------------------------------------
# 🧺 release
# ------------------------------------------------------------------

# you can consume the saved choices like this:
# CHOSEN_MESSAGE_CHOICE_FILE="${TEMP_DIR}/step3.choice.step2.1.git.commit.message.path"
# CHOSEN_PLAN_CHOICE_FILE="${TEMP_DIR}/step3.choice.step2.git.commit.plan.path"
# CHOSEN_MESSAGE_CHOICE="$(cat "$CHOSEN_MESSAGE_CHOICE_FILE")"
# CHOSEN_PLAN_CHOICE="$(cat "$CHOSEN_PLAN_CHOICE_FILE")"
# echo "chosen message: $CHOSEN_MESSAGE_CHOICE"
# echo "chosen plan:    $CHOSEN_PLAN_CHOICE"
