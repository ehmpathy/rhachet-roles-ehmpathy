#!/usr/bin/env bash
######################################################################
# .what = link Claude transcripts into project-local structure
#
# .why  = Claude stores transcripts in ~/.claude/projects/<encoded-path>
#         which makes them hard to browse, version-control, and sync.
#
#         this script creates a symlink so transcripts appear under:
#           <project>/.rhachet/claude/transcripts
#
#         without altering, moving, or creating files in Claude storage.
#
# guarantee:
#   ✔ zero mutation to Claude's storage
#   ✔ fail-fast if transcripts don't exist yet
#   ✔ safe to rerun (idempotent)
######################################################################

set -euo pipefail

PROJECT_ROOT="$PWD"
DEST="$PROJECT_ROOT/.rhachet/claude/transcripts"

# Resolve where Claude stores transcripts for this project’s cwd
ENCODED_PATH="$(echo "$PROJECT_ROOT" | sed 's#/#-#g')"
CLAUDE_STORAGE="$HOME/.claude/projects/$ENCODED_PATH"

# Fail if Claude hasn't created the storage dir yet
if [[ ! -d "$CLAUDE_STORAGE" ]]; then
  echo "❌ no Claude transcripts found for this project:"
  echo "   $CLAUDE_STORAGE"
  echo "➡️  first run 'claude' once in this directory to create them"
  exit 2
fi

# Ensure our local parent folder exists (not Claude’s)
mkdir -p "$(dirname "$DEST")"

# Create symlink pointing into Claude-managed storage
ln -sfn "$CLAUDE_STORAGE" "$DEST"

echo "🔗 linked:"
echo "  $DEST → $CLAUDE_STORAGE"
