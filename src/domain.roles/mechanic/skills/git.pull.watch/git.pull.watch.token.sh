#!/usr/bin/env bash
######################################################################
# .what = read the github token from keyrack, for the daemon: the ehmpath
#         seaturtle token, else the grove's ambient machine token
#
# .why  = the daemon reads github only with a keyrack token, never the human
#         login (F11); a grove with no seaturtle token still holds one machine
#         token for every clone (@all.prep.GITHUB_TOKEN), so the daemon reads
#         with it rather than pause. the read lives in its own file so a test
#         can drive it against the real keyrack, with no daemon loop around it
#
# usage:
#   source "$SKILL_DIR/git.pull.watch.operations.sh"
#   source "$SKILL_DIR/git.pull.watch.token.sh"
#   get_watch_token "$repo_root"           # the seaturtle token
#   get_watch_token_ambient "$repo_root"   # the grove token; returns 1 if not granted
#
# guarantee:
#   - WATCH_TOKEN_STATUS is one of granted | locked | absent | blocked | fault
#   - WATCH_TOKEN_SOURCE names the key a grant came from: seaturtle | ambient
#   - a reply that does not parse, or a grant with no secret, reads fault
#   - bounded at 30s per read; get_watch_token always returns 0, so a caller
#     branches on the status
######################################################################

# token of this tick: WATCH_TOKEN, WATCH_TOKEN_STATUS (granted|locked|absent|blocked|fault),
# WATCH_TOKEN_FAULT, the cause of a fault (keyrack's last stderr line), and
# WATCH_TOKEN_SOURCE, the key a grant came from (seaturtle|ambient)
WATCH_TOKEN=""
WATCH_TOKEN_STATUS=""
WATCH_TOKEN_FAULT=""
WATCH_TOKEN_SOURCE=""

# .what = the status and secret of a keyrack json reply, tab-separated
# .why  = a reply that does not parse, or a grant with no secret, is a fault
as_watch_token_state() {
  local out="$1" status secret
  status="$(printf '%s' "$out" | jq -r '.status // empty' 2>/dev/null || echo "")"
  secret="$(printf '%s' "$out" | jq -r '.grant.key.secret // empty' 2>/dev/null || echo "")"
  [[ -n "$status" ]] || status="fault"
  [[ "$status" == "granted" && -z "$secret" ]] && status="fault"
  printf '%s\t%s' "$status" "$secret"
}

# the full slug of the token: org.env.KEY
# .why  = a bare key name needs a keyrack.yml at the cwd to build its slug, and a
#         watched repo may hold none; the full slug reads the same key from any root
WATCH_TOKEN_SLUG="ehmpathy.prep.EHMPATHY_SEATURTLE_GITHUB_TOKEN"

# .what = read the ehmpath github token from keyrack, cwd at a watch's repo root
# .why  = the repo's own rhachet reads it; a key outside a repo manifest reads
#         `absent` even when locked (R3), so the read runs where a manifest lives
# .note = bounded at 30s via run_watch_rhachet, which serves where gnu timeout is absent
get_watch_token() {
  local root="$1" out err_file rc=0
  err_file="$(mktemp)"
  out="$(run_watch_rhachet "$root" 30 keyrack get --key "$WATCH_TOKEN_SLUG" \
    --owner ehmpath --env prep --allow-dangerous --json 2>>"$err_file")" || rc=$?
  WATCH_TOKEN_FAULT="$(as_watch_fault_cause <"$err_file")"
  rm -f "$err_file"
  [[ $rc -eq 124 && -z "$WATCH_TOKEN_FAULT" ]] && WATCH_TOKEN_FAULT="keyrack gave no reply in 30s"
  IFS=$'\t' read -r WATCH_TOKEN_STATUS WATCH_TOKEN <<<"$(as_watch_token_state "$out")" || true
  WATCH_TOKEN_SOURCE=""
  [[ "$WATCH_TOKEN_STATUS" == "granted" ]] && WATCH_TOKEN_SOURCE="seaturtle"
  return 0
}

# the full slug of the grove's ambient machine token
# .why  = an @all key serves every repo on the machine, with or without a manifest
WATCH_TOKEN_SLUG_AMBIENT="@all.prep.GITHUB_TOKEN"

# .what = read the grove's ambient machine token; on a grant, it becomes the token
# .why  = where the seaturtle token is not set, the machine token every clone of
#         the grove shares still reads github; never the human login (F11)
# .note = returns 1 and leaves the token state as it was, where not granted, so the
#         pause still names the seaturtle fix
get_watch_token_ambient() {
  local root="$1" out status secret
  out="$(run_watch_rhachet "$root" 30 keyrack get --key "$WATCH_TOKEN_SLUG_AMBIENT" \
    --owner ehmpath --env prep --allow-dangerous --json 2>/dev/null)" || true
  IFS=$'\t' read -r status secret <<<"$(as_watch_token_state "$out")" || true
  [[ "$status" == "granted" ]] || return 1
  WATCH_TOKEN="$secret"
  WATCH_TOKEN_STATUS="granted"
  WATCH_TOKEN_FAULT=""
  WATCH_TOKEN_SOURCE="ambient"
  return 0
}
