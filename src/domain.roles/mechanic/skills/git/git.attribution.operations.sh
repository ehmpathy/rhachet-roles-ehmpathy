#!/usr/bin/env bash
######################################################################
# .what = pr body attribution: one declaration, read by every writer of a pr body
#
# .why  = git.commit.push (on create) and git.pull.description.set (on every
#         set) both sign a pr body; one declaration keeps the two from drift
#
# usage:
#   source "$SKILL_DIR/../git/git.attribution.operations.sh"
#
# .note = it lives in skills/git/, the common ancestor of the git.commit and
#         git.pull trees, so each writer reads it from a dir neither noun owns
#
# guarantee:
#   - pure: declares naught but text transforms; no gh call, no io
######################################################################

# .what = the lead every seaturtle attribution opens with, of any bot name
# .why  = the classifier matches a prior footer by this lead, so the one text
#         the footer is built from is the one text the strip looks for
PR_BODY_ATTRIBUTION_LEAD='🐢🌊 surfed in by '

# .what = the attribution every pr body this role writes ends with
PR_BODY_ATTRIBUTION="${PR_BODY_ATTRIBUTION_LEAD}seaturtle[bot]"

# .what = the one line classifier of a pr body: each line is kept, or is one of
#         three kinds of foreign attribution
# .why  = the strip and the report of what it stripped both read this one
#         classifier, so they cannot disagree. each kind is matched by the WHOLE
#         line's shape, so prose that merely mentions a kind is kept:
#         - coauthor: a `Co-authored-by:` line in trailer shape (it ends in a
#           `<…>`) or that holds an email anywhere, in any case, crlf or lf. it
#           leaks the human's email onto the public pr; github renders
#           co-authors from the commit. the harness writes `Co-Authored-By:`,
#           hence case-blind. a line with neither is prose that names the
#           trailer, and is kept
#         - claude: the harness line alone on its line: an optional 🤖, then
#           `Generated with` and `Claude Code`, bare or as a markdown link
#         - footer: a prior seaturtle attribution line of any bot name
#           (`🐢🌊 surfed in by <name>[bot]`), so the one appended stands once,
#           never twice, even after the declared footer text changes
#         a line inside a closed code fence is quoted text, never attribution,
#         so it is kept. an unclosed fence shelters naught: the harness line
#         after a stray ``` is still stripped
# .note = mode=strip prints the kept lines, and drops a `---` rule and the
#         blank lines on each side of it just above each stripped line, so no
#         orphan rule or blank run stays where an attribution stood.
#         mode=report prints one line per kind found
PR_BODY_LINE_CLASSIFIER='
  function kind(line,   l) {
    l = tolower(line)
    sub(/^[ \t]+/, "", l); sub(/[ \t\r]+$/, "", l)
    if (l ~ /^co-authored-by:/ && (l ~ /[^ \t<>]+@[^ \t<>]+\.[^ \t<>]+/ || l ~ /<[^>]*>$/)) return "coauthor"
    if (index(l, lead) == 1 && l ~ /\[bot\]$/) return "footer"
    if (index(l, "🤖") == 1) { l = substr(l, length("🤖") + 1); sub(/^[ \t]+/, "", l) }
    if (l ~ /^generated with (claude code|\[claude code\]\([^)]*\))[.!]?$/) return "claude"
    return "keep"
  }
  function is_fence(line) { return line ~ /^[ \t]*(```|~~~)/ }
  { raw[++m] = $0 }
  END {
    # mark each line of a closed fence, its two fence lines included
    for (i = 1; i <= m; i++) {
      if (!is_fence(raw[i])) continue
      for (j = i + 1; j <= m && !is_fence(raw[j]); j++) ;
      if (j > m) break
      for (x = i; x <= j; x++) fenced[x] = 1
      i = j
    }
    for (i = 1; i <= m; i++) {
      k = (i in fenced) ? "keep" : kind(raw[i])
      if (mode == "report") { if (k != "keep") found[k] = 1; continue }
      if (k == "keep") { lines[++n] = raw[i]; continue }
      while (n > 0 && lines[n] ~ /^[ \t]*$/) n--
      if (n > 0 && lines[n] == "---") n--
      while (n > 0 && lines[n] ~ /^[ \t]*$/) n--
    }
    if (mode == "report") {
      if (found["claude"]) print "stripped the claude code line"
      if (found["coauthor"]) print "stripped the co-authored-by trailer(s)"
      if (found["footer"]) print "stripped the prior seaturtle footer"
      exit
    }
    for (i = 1; i <= n; i++) print lines[i]
  }'

# .what = strip foreign attribution and blank tail lines from a pr body
# .why  = the pr body carries one attribution: the seaturtle footer; the
#         classifier above names what must not ride along
# usage: clean=$(get_clean_pr_body "$PR_BODY")
get_clean_pr_body() {
  local body="$1"
  # awk keeps each line the classifier keeps, and drops the blanks just above a
  # stripped line; the sed trims the blank tail lines. blank runs the caller
  # wrote (a code fence, say) are kept as written
  printf '%s\n' "$body" \
    | awk -v mode=strip -v lead="$PR_BODY_ATTRIBUTION_LEAD" "$PR_BODY_LINE_CLASSIFIER" \
    | sed -e :a -e '/^\n*$/{$d;N;ba;}'
}

# .what = the repairs get_clean_pr_body makes to a body, one line per kind
# .why  = a set edits what the caller passed; the plan names each strip, so
#         the edit never surprises
# usage: mapfile -t repairs < <(get_all_pr_body_repairs "$PR_BODY")
get_all_pr_body_repairs() {
  local body="$1"
  printf '%s\n' "$body" \
    | awk -v mode=report -v lead="$PR_BODY_ATTRIBUTION_LEAD" "$PR_BODY_LINE_CLASSIFIER"
}

# .what = a pr body, cleaned, that ends in exactly one seaturtle attribution
# .why  = strip, then append: a body read back from github already wears the
#         footer, so only strip-then-append converges on a round trip
# usage: body=$(as_pr_body_attributed "$PR_BODY")
as_pr_body_attributed() {
  local clean
  clean="$(get_clean_pr_body "$1")"
  printf '%s\n\n---\n%s' "$clean" "$PR_BODY_ATTRIBUTION"
}
