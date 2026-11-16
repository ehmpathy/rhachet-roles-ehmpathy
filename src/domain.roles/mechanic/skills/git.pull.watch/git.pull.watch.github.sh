#!/usr/bin/env bash
######################################################################
# .what = github reads for the pr-watch daemon: one etag read per endpoint,
#         through a per-pr cache shared by every watcher
#
# .why  = a 304 costs no rate limit (github rest best practices), so a poll
#         each tick is free while a pr is quiet. one read per pr per tick
#         serves every clone that watches it
#
# usage:
#   source "$SKILL_DIR/git.pull.watch.github.sh"
#   body="$(get_watch_github_resource "$cache_dir" "repos/ehmpathy/surf-demo/pulls/1220" "$token")"
#
# guarantee:
#   - `gh api` exits 1 on a 304; that reads as unchanged, never as a fault
#   - a 401 returns 3, so the caller pauses rather than retries blind
#   - a rate limit returns 4 and an outage 5, so the caller backs off
#   - a reply whose quota left sits below the yield floor (10% of the limit)
#     returns 4 too, so the poll never spends the clones' last calls
#   - the cached etag is stored verbatim, a weak `W/` prefix included
#   - gh runs with GH_TOKEN set to the ehmpath token; the human login is never read
#   - each gh call is bounded; a stall reads as unreachable (5), never a hung tick
######################################################################

# the bound lives in the operations file; source it where the caller has not
declare -F run_watch_bounded >/dev/null \
  || source "$(dirname "${BASH_SOURCE[0]}")/git.pull.watch.operations.sh"

# .what = the longest one gh call may take, in seconds
# .why  = a stalled read would hang the tick, and an idle clone would never hear
#         of its pr again; the bound turns the stall into an outage the tick holds
WATCH_GITHUB_READ_MAX_SECONDS="${GIT_PULL_WATCH_GITHUB_READ_MAX_SECONDS:-60}"

# .what = the cache file stem of one endpoint
as_watch_cache_stem() {
  printf '%s' "$1" | tr '/?=&' '____'
}

# .what = the status code from the first line of a `gh api -i` reply, or empty
as_watch_http_status() {
  printf '%s\n' "$1" | head -n 1 | tr -d '\r' | awk '{ print $2 }'
}

# .what = the value of one header from a `gh api -i` reply, or empty
# .note = header names are case-blind; the header block ends at the first blank line
as_watch_http_header() {
  local raw="$1" name="$2"
  printf '%s\n' "$raw" | tr -d '\r' | awk -v name="$name" '
    NR == 1 { next }
    /^$/ { exit }
    { split($0, kv, ": "); if (tolower(kv[1]) == tolower(name)) { sub(/^[^:]*: /, ""); print; exit } }'
}

# .what = the body of a `gh api -i` reply: all after the first blank line
as_watch_http_body() {
  printf '%s\n' "$1" | tr -d '\r' | awk 'found { print } /^$/ && !found { found = 1 }'
}

# .what = is this reply a rate limit (primary or secondary)?
# .note = the header name is github's own
is_watch_http_rate_limited() {
  local status="$1" raw="$2" err="$3"
  [[ "$status" == "403" || "$status" == "429" ]] || return 1
  [[ "$(as_watch_http_header "$raw" x-ratelimit-remaining)" == "0" ]] && return 0
  [[ -n "$(as_watch_http_header "$raw" retry-after)" ]] && return 0
  [[ "$err" == *"rate limit"* ]]
}

# .what = the share of the core quota the poll leaves to the clones, in percent
# .why  = the daemon's token is the clones' account; their own gh work must
#         never meet an empty bucket because the poll spent the last of it
WATCH_QUOTA_FLOOR_PERCENT="${GIT_PULL_WATCH_QUOTA_FLOOR_PERCENT:-10}"

# .what = has the quota left fallen below the yield floor? reads the rate limit
#         headers of a reply; a reply with no such headers is never below it
# .note = the header names are github's own
is_watch_quota_below_floor() {
  local raw="$1" left limit
  left="$(as_watch_http_header "$raw" x-ratelimit-remaining)"
  limit="$(as_watch_http_header "$raw" x-ratelimit-limit)"
  [[ "$left" =~ ^[0-9]+$ && "$limit" =~ ^[0-9]+$ && "$limit" -gt 0 ]] || return 1
  [[ $(( left * 100 )) -lt $(( limit * WATCH_QUOTA_FLOOR_PERCENT )) ]]
}

# .what = the epoch at which a rate limit lifts: retry-after, else the reset
#         header, else one minute from now
as_watch_rate_limit_until() {
  local raw="$1" now reset after
  now="$(date +%s)"
  after="$(as_watch_http_header "$raw" retry-after)"
  reset="$(as_watch_http_header "$raw" x-ratelimit-reset)"
  [[ "$after" =~ ^[0-9]+$ ]] && { echo $((now + after)); return 0; }
  [[ "$reset" =~ ^[0-9]+$ && "$reset" -gt "$now" ]] && { echo "$reset"; return 0; }
  echo $((now + 60))
}

# .what = append one read to the read ledger: epoch, status, and the rate limit
#         headers github sent with it (calls left, calls used, resource), tab-separated
# .why  = the cost of the poll is measured, never guessed: a 304 and a 200 each
#         leave a row, so a window of ticks shows what github charged for them
# .note = opt-in: writes only where GIT_PULL_WATCH_READS_LOG names a file
# .note = the header names are github's own
set_watch_read_ledger() {
  local raw="$1" status="$2" endpoint="$3"
  [[ -n "${GIT_PULL_WATCH_READS_LOG:-}" ]] || return 0
  printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$(date +%s)" "$status" \
    "$(as_watch_http_header "$raw" x-ratelimit-remaining)" \
    "$(as_watch_http_header "$raw" x-ratelimit-used)" \
    "$(as_watch_http_header "$raw" x-ratelimit-resource)" \
    "$endpoint" >>"$GIT_PULL_WATCH_READS_LOG"
}

# .what = read one endpoint with an etag; print its body (the cached one on a 304)
# .why  = a quiet pr then costs no rate limit; the return code tells the tick
#         whether to pause, back off, hold, or read on
# returns: 0 = body printed · 3 = auth refused (401) · 4 = rate limited (the
#          lift epoch in $cache_dir/ratelimit.until) · 5 = github unreachable ·
#          1 = any other fault (stderr names it)
# .what = may this cached list span pages? a bare array or a check_runs list of
#         a full page (100) or more
# .why  = page one's etag never sees a change on a later page, so such a list
#         is read whole; check-runs is object-shaped, so length alone misses it
is_watch_list_multipage() {
  local body_file="$1" count
  count="$(jq 'if type == "array" then length elif (.check_runs | type) == "array" then (.check_runs | length) else 0 end' "$body_file" 2>/dev/null || echo 0)"
  [[ "$count" =~ ^[0-9]+$ && "$count" -ge 100 ]]
}

# .note = a list endpoint with a next page is read whole via --paginate, so a
#         long pr never hides its newest comments past page one
get_watch_github_resource() {
  local cache_dir="$1" endpoint="$2" token="$3"
  local stem etag_file body_file etag="" err_file raw err rc=0 status body pages
  stem="$(as_watch_cache_stem "$endpoint")"
  etag_file="$cache_dir/$stem.etag"
  body_file="$cache_dir/$stem.json"
  mkdir -p "$cache_dir"
  [[ -f "$etag_file" && -f "$body_file" ]] && etag="$(cat "$etag_file")"

  # a list that spans pages grows on its last page, which page one's etag
  # never sees; such a list is read whole each tick, with no etag
  [[ -n "$etag" ]] && is_watch_list_multipage "$body_file" && etag=""

  # one conditional read
  local args=(api --method GET -i "$endpoint")
  [[ -n "$etag" ]] && args+=(-H "If-None-Match: $etag")
  err_file="$(mktemp)"
  raw="$(GH_TOKEN="$token" run_watch_bounded "$WATCH_GITHUB_READ_MAX_SECONDS" gh "${args[@]}" 2>"$err_file")" || rc=$?
  err="$(cat "$err_file")"
  rm -f "$err_file"
  status="$(as_watch_http_status "$raw")"
  set_watch_read_ledger "$raw" "${status:-none}" "$endpoint"

  # stalled: no reply inside the bound; the tick holds as on an outage
  if [[ $rc -eq 124 ]]; then
    echo "github unreachable: $endpoint (no reply in ${WATCH_GITHUB_READ_MAX_SECONDS}s)" >&2
    return 5
  fi

  # the yield floor: once the quota left falls below its floor, the poll holds
  # every read until the reset, as on a rate limit; cursors hold, so no event is lost
  if [[ "$status" == "200" || "$status" == "304" ]] && is_watch_quota_below_floor "$raw"; then
    as_watch_rate_limit_until "$raw" >"$cache_dir/ratelimit.until"
    echo "github quota below the yield floor (${WATCH_QUOTA_FLOOR_PERCENT}%): $endpoint" >&2
    return 4
  fi

  # unchanged: the cache holds the body
  if [[ "$status" == "304" || "$err" == *"HTTP 304"* ]] && [[ -f "$body_file" ]]; then
    cat "$body_file"
    return 0
  fi

  # auth refused: the token expired or was revoked
  if [[ "$status" == "401" || "$err" == *"HTTP 401"* || "$err" == *"Bad credentials"* ]]; then
    return 3
  fi

  # rate limited: the reset epoch lands in the cache dir, so the daemon holds
  # every read until then (A29)
  if is_watch_http_rate_limited "$status" "$raw" "$err"; then
    as_watch_rate_limit_until "$raw" >"$cache_dir/ratelimit.until"
    echo "github rate limited: $endpoint (status: $status)" >&2
    return 4
  fi

  # unreachable: no reply at all, or github itself faulted (A30)
  if [[ $rc -ne 0 && ( -z "$status" || "$status" == 5* ) ]]; then
    echo "github unreachable: $endpoint (status: ${status:-none}) ${err}" >&2
    return 5
  fi

  # any other fault: name it, hold the cursors
  if [[ $rc -ne 0 || "$status" != "200" ]]; then
    echo "github read failed: $endpoint (status: ${status:-none}) ${err}" >&2
    return 1
  fi

  # fresh: read the whole list where a next page exists
  body="$(as_watch_http_body "$raw")"
  if [[ "$(as_watch_http_header "$raw" link)" == *'rel="next"'* ]]; then
    rc=0
    pages="$(GH_TOKEN="$token" run_watch_bounded "$WATCH_GITHUB_READ_MAX_SECONDS" gh api --method GET --paginate "$endpoint" 2>"$cache_dir/$stem.err")" || rc=$?
    if [[ $rc -eq 124 ]]; then
      echo "github unreachable: $endpoint (pages gave no reply in ${WATCH_GITHUB_READ_MAX_SECONDS}s)" >&2
      return 5
    fi
    [[ $rc -eq 0 ]] && set_watch_read_ledger "" "paged:$(printf '%s' "$pages" | jq -s 'length')" "$endpoint"
    [[ $rc -eq 0 ]] && { body="$(printf '%s' "$pages" | jq -s 'if (.[0] | type) == "array" then add else { check_runs: (map(.check_runs // []) | add) } end')" || rc=$?; }
    if [[ $rc -ne 0 ]]; then
      echo "github paginated read failed: $endpoint $(cat "$cache_dir/$stem.err" 2>/dev/null)" >&2
      return 1
    fi
  fi

  # store the etag verbatim and the body, then print the body
  printf '%s' "$body" >"$body_file.tmp.$$"
  mv "$body_file.tmp.$$" "$body_file"
  printf '%s' "$(as_watch_http_header "$raw" etag)" >"$etag_file"
  printf '%s' "$body"
  return 0
}

######################################################################
# the pr state: every read one tick makes for one pr
# .note = reads $KEY_DIR (the cache root) and $WATCH_TOKEN, as the daemon sets them
######################################################################

# .what = read one endpoint into the pr cache; print the path of its body file
# .why  = bodies can outgrow one argv slot (128k), so jq reads them as files
get_watch_pr_resource_file() {
  local cache="$1" endpoint="$2" rc=0
  get_watch_github_resource "$cache" "$endpoint" "$WATCH_TOKEN" >/dev/null || rc=$?
  [[ $rc -eq 0 ]] || return $rc
  echo "$cache/$(as_watch_cache_stem "$endpoint").json"
}

# .what = the cache dir of one pr
# .why  = etags and bodies live per pr, so every watcher of it shares one read
get_watch_pr_cache_dir() {
  local repo="$1" pr="$2"
  echo "$KEY_DIR/cache/${repo%%/*}.${repo#*/}.pr=$pr"
}

# .what = was this pr closed with no merge? (reads a pull json file)
is_watch_pr_closed_unmerged() {
  [[ "$(jq -r '(.state == "closed") and (.merged != true)' "$1")" == "true" ]]
}

# .what = read the github state of one pr into a json file
# .why  = one read per pr per tick, shared by every watch on it
# returns: 0 ok · 3 auth refused · 4 rate limited · 5 unreachable · 1 other fault
get_watch_pr_state() {
  local repo="$1" pr="$2" out="$3" cache base pull head checks issues reviews_c reviews closed_by="" issue
  cache="$(get_watch_pr_cache_dir "$repo" "$pr")"
  base="repos/$repo"
  pull="$(get_watch_pr_resource_file "$cache" "$base/pulls/$pr")" || return $?
  head="$(jq -r '.head.sha // empty' "$pull")"
  checks="$cache/checks.none.json"
  echo '{"check_runs":[]}' >"$checks"
  if [[ -n "$head" ]]; then
    checks="$(get_watch_pr_resource_file "$cache" "$base/commits/$head/check-runs?per_page=100")" || return $?
  fi
  issues="$(get_watch_pr_resource_file "$cache" "$base/issues/$pr/comments?per_page=100")" || return $?
  reviews_c="$(get_watch_pr_resource_file "$cache" "$base/pulls/$pr/comments?per_page=100")" || return $?
  reviews="$(get_watch_pr_resource_file "$cache" "$base/pulls/$pr/reviews?per_page=100")" || return $?

  # who closed it: only read once the pr is closed without merge
  if is_watch_pr_closed_unmerged "$pull"; then
    issue="$(get_watch_pr_resource_file "$cache" "$base/issues/$pr")" || return $?
    closed_by="$(jq -r '.closed_by.login // empty' "$issue")"
  fi

  jq -n --slurpfile pull "$pull" --slurpfile checks "$checks" --slurpfile issues "$issues" \
    --slurpfile reviewComments "$reviews_c" --slurpfile reviews "$reviews" --arg closedBy "$closed_by" \
    '{ pull: $pull[0], checks: $checks[0], issueComments: $issues[0], reviewComments: $reviewComments[0], reviews: $reviews[0], closedBy: $closedBy }' >"$out"
}
