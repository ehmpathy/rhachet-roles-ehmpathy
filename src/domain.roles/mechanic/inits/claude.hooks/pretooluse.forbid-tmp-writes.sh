#!/usr/bin/env bash
######################################################################
# .what = PreToolUse hook to block access to /tmp/*
#
# .why  = /tmp is not actually temporary - it persists indefinitely
#         and never auto-cleans. use .temp/ instead, which is scoped
#         to the repo and gitignored.
#
# .how  = reads JSON from stdin, checks file_path or command for
#         /tmp access patterns, blocks with guidance message.
#
# usage:
#   configure in .claude/settings.json under hooks.PreToolUse
#
# guarantee:
#   - blocks Write/Edit/Read to /tmp/*
#   - blocks Bash writes (redirects, tee, cp, mv) to /tmp/*
#   - blocks Bash reads from /tmp/* EXCEPT /tmp/claude*
#   - allows reads from /tmp/claude* (agent temp directories)
#   - shows guidance with .temp/ alternative
######################################################################

set -euo pipefail

# read JSON from stdin
STDIN_INPUT=$(cat)

# failfast: if no input, error
if [[ -z "$STDIN_INPUT" ]]; then
  echo "ERROR: PreToolUse hook received no input via stdin" >&2
  exit 2
fi

# extract tool name
TOOL_NAME=$(echo "$STDIN_INPUT" | jq -r '.tool_name // empty' 2>/dev/null || echo "")

# skip if not Write, Edit, Read, or Bash
if [[ "$TOOL_NAME" != "Write" && "$TOOL_NAME" != "Edit" && "$TOOL_NAME" != "Read" && "$TOOL_NAME" != "Bash" ]]; then
  exit 0
fi

# check Write/Edit/Read file_path
if [[ "$TOOL_NAME" == "Write" || "$TOOL_NAME" == "Edit" || "$TOOL_NAME" == "Read" ]]; then
  FILE_PATH=$(echo "$STDIN_INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null || echo "")

  # check if file_path starts with /tmp/ or is exactly /tmp
  if [[ "$FILE_PATH" == /tmp || "$FILE_PATH" == /tmp/* ]]; then
    # allow reads from /tmp/claude* (agent temp directories)
    if [[ "$TOOL_NAME" == "Read" && "$FILE_PATH" == /tmp/claude* ]]; then
      exit 0
    fi

    # block with guidance
    {
      echo ""
      echo "🛑 BLOCKED: $TOOL_NAME to $FILE_PATH"
      echo ""
      echo "use .temp/ instead:"
      echo ""
      echo "  echo \"data\" > .temp/scratch.txt"
      echo ""
      echo "/tmp is not temporary - it persists and never auto-cleans."
      echo ".temp/ is scoped to this repo and gitignored."
      echo ""
    } >&2
    exit 2
  fi

  # allow non-/tmp Write/Edit/Read
  exit 0
fi

# check Bash command for /tmp access
COMMAND=$(echo "$STDIN_INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || echo "")

# skip if no command
if [[ -z "$COMMAND" ]]; then
  exit 0
fi

# detect writes to /tmp
TMP_WRITE_DETECTED=false

# check output redirect: > /tmp or >> /tmp
if [[ "$COMMAND" =~ \>[[:space:]]*/tmp(/|$) ]] || [[ "$COMMAND" =~ \>\>[[:space:]]*/tmp(/|$) ]]; then
  TMP_WRITE_DETECTED=true
fi

# check tee: tee /tmp or tee -a /tmp
if [[ "$COMMAND" =~ tee[[:space:]]+-?a?[[:space:]]*/tmp(/|$) ]] || [[ "$COMMAND" =~ tee[[:space:]]*/tmp(/|$) ]]; then
  TMP_WRITE_DETECTED=true
fi

# check cp: cp ... /tmp
# match cp with any flags followed by /tmp as destination
if [[ "$COMMAND" =~ cp[[:space:]].*[[:space:]]/tmp(/|$) ]]; then
  TMP_WRITE_DETECTED=true
fi

# check mv: mv ... /tmp
if [[ "$COMMAND" =~ mv[[:space:]].*[[:space:]]/tmp(/|$) ]]; then
  TMP_WRITE_DETECTED=true
fi

# if /tmp write detected, block
if [[ "$TMP_WRITE_DETECTED" == true ]]; then
  {
    echo ""
    echo "🛑 BLOCKED: Bash write to /tmp"
    echo ""
    echo "use .temp/ instead:"
    echo ""
    echo "  echo \"data\" > .temp/scratch.txt"
    echo ""
    echo "/tmp is not temporary - it persists and never auto-cleans."
    echo ".temp/ is scoped to this repo and gitignored."
    echo ""
  } >&2
  exit 2
fi

# detect reads from /tmp/* (but allow /tmp/claude*)
TMP_READ_DETECTED=false
TMP_READ_PATH=""

# check read commands: cat, head, tail, less, more, grep, etc.
# pattern: command [flags] /tmp/path (but not /tmp/claude*)
if [[ "$COMMAND" =~ (cat|head|tail|less|more)[[:space:]].*(/tmp/[^[:space:]]+) ]]; then
  TMP_READ_PATH="${BASH_REMATCH[2]}"
  if [[ ! "$TMP_READ_PATH" == /tmp/claude* ]]; then
    TMP_READ_DETECTED=true
  fi
fi

# check grep with /tmp path
if [[ "$COMMAND" =~ grep[[:space:]].*(/tmp/[^[:space:]]+) ]]; then
  TMP_READ_PATH="${BASH_REMATCH[1]}"
  if [[ ! "$TMP_READ_PATH" == /tmp/claude* ]]; then
    TMP_READ_DETECTED=true
  fi
fi

# if /tmp read detected, block
if [[ "$TMP_READ_DETECTED" == true ]]; then
  {
    echo ""
    echo "🛑 BLOCKED: Bash read from $TMP_READ_PATH"
    echo ""
    echo "only /tmp/claude* is allowed (agent temp directories)."
    echo "for scratch files, use .temp/ instead."
    echo ""
    echo "/tmp is not temporary - it persists and never auto-cleans."
    echo ".temp/ is scoped to this repo and gitignored."
    echo ""
  } >&2
  exit 2
fi

# allow command
exit 0
