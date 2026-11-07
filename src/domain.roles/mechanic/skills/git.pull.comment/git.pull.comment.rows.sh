#!/usr/bin/env bash
######################################################################
# .what = the pure row transformers of a pr's comments, and the one
#         rule of what still waits on an answer
#
# .why  = `git.pull.comment get --unanswered` and `git.release` must judge
#         one comment the same way. both source this file, so the rule has
#         one home and the two verbs cannot drift apart
#
# usage:
#   source "$SKILL_DIR/../git.pull.comment/git.pull.comment.rows.sh"
#   rows="$(as_comment_rows_from_gh_lists "$issue_list" "$review_list")"
#   states="$(as_thread_states_from_graphql "$pages" "$pr")" || return 1
#   rows="$(as_rows_with_thread_state "$rows" "$states")"
#   unanswered="$(as_rows_unanswered "$rows")"
#
# guarantee:
#   - sources only; defines constants and pure jq transformers, no gh call
#   - sets no global that a caller already holds (no SKILL_DIR)
######################################################################

# the signature: set opens every body it writes with it, del refuses a body
# without it, and the unanswered rule counts only a signed, keyed comment an answer
COMMENT_SIGNATURE='🐢'

# the key marker: a hidden html comment at the tail of a keyed comment.
# two grammars, each held once: STRIP finds a marker anywhere, so set removes
# every stray one; CLAIM finds only a marker on its own last line, so a marker
# typed or quoted mid-body never claims a key
COMMENT_KEY_MARKER_REGEX='<!-- rhx:git.pull.comment key=([a-z0-9][a-z0-9._-]*) -->'
# .note = jq's regex runs in perl syntax, where ^ anchors the string start, not a
#         line; so the claim names its line start as (?:^|\n), its end as \s*\z
COMMENT_KEY_CLAIM_REGEX='(?:^|\n)<!-- rhx:git.pull.comment key=([a-z0-9][a-z0-9._-]*) -->\s*\z'

# the review threads of a pr, each with its resolution and the ids it holds
# .note = rest lists every review comment, yet only graphql holds a thread's
#         resolution. a thread past 100 comments leaves its tail ids unnamed;
#         an unnamed id reads "open", so the cap fails closed, never green
COMMENT_REVIEW_THREADS_QUERY='query($owner: String!, $name: String!, $pr: Int!, $endCursor: String) {
  repository(owner: $owner, name: $name) { pullRequest(number: $pr) {
    reviewThreads(first: 100, after: $endCursor) {
      pageInfo { hasNextPage endCursor }
      nodes { isResolved comments(first: 100) { nodes { databaseId } } }
    } } } }'

# jq defs: the key a comment claims, and one github resource as a row
# .why  = every reader of a key and every builder of a row runs these defs, so
#         `get`, `set`, `del`, and `git.release` cannot disagree on either
# .note = each call passes --arg re "$COMMENT_KEY_CLAIM_REGEX"; $extra is merged
#         ahead of url and body, so a caller's fields keep one key order
COMMENT_JQ_KEY_DEFS='
  def key_of: [(.body // "") | match($re; "g") | .captures[0].string] | last;
'
COMMENT_JQ_ROW_DEFS="$COMMENT_JQ_KEY_DEFS"'
  def as_row($kind; $extra): {
    kind: $kind,
    id: (if $kind == "body" then null else .id end),
    author: (.user.login // null),
    created_at: (.created_at // null),
    in_reply_to: (.in_reply_to_id // null),
    key: key_of,
    path: (.path // null),
    line: (.line // .original_line // null)
  } + $extra + { url: (.html_url // null), body: (.body // "") };
'

# .what = the pages of a `gh api --paginate` list read, as one json array
# .why  = gh prints one array per page; a key or a row on page two must count
as_list_from_gh_pages() {
  printf '%s' "$1" | jq -cs 'map(if type == "array" then . else [.] end) | add // []'
}

# .what = github's issue and review comment lists as rows, read order
# .why  = git.release reads the lists with its own credential; the rows it
#         judges carry the fields `as_rows_unanswered` reads
# .note = get.sh builds each row with the same `as_row`, plus a hash and a size
as_comment_rows_from_gh_lists() {
  jq -cn --argjson issue "$1" --argjson review "$2" --arg re "$COMMENT_KEY_CLAIM_REGEX" "$COMMENT_JQ_ROW_DEFS"'
    ($issue | map(as_row("issue"; {}))) + ($review | map(as_row("review"; {}))) | sort_by(.created_at, .id)'
}

# .what = does every page of a reviewThreads read name the pull request?
# .why  = a page with no pull request (a null repository, a wrong number) holds
#         no threads; read as whole, each review row would default to "open"
#         with no word of the failed read
is_thread_page_whole() {
  printf '%s' "$1" | jq -se 'length > 0 and all(.[]; .data.repository.pullRequest != null)' >/dev/null 2>&1
}

# .what = the thread state map from the pages of the reviewThreads query:
#         { "<review comment id>": "open" | "resolved" }
# .why  = each review row learns its thread state from one map, one way
# .note = args: the pages, then the pr number (named in the failure)
# .note = fails closed, exit 1 with a plain cause on stderr, when any page
#         names no pull request; so `get` and `git.release` both refuse a blind read
as_thread_states_from_graphql() {
  if ! is_thread_page_whole "$1"; then
    echo "github found no pull request #$2 for the review thread read" >&2
    return 1
  fi
  printf '%s' "$1" | jq -cs '
    [ .[] | .data.repository.pullRequest.reviewThreads.nodes[]?
      | (if .isResolved then "resolved" else "open" end) as $state
      | .comments.nodes[] | { key: "\(.databaseId)", value: $state } ]
    | from_entries'
}

# .what = the rows, each review row given its thread state: "open" | "resolved"
# .why  = a reader must see which review threads still wait on an answer
# .note = a review row graphql does not name reads "open"; a non-review row reads null
as_rows_with_thread_state() {
  printf '%s' "$1" | jq -c --argjson states "$2" '
    map(.thread = (if .kind == "review" then ($states["\(.id)"] // "open") else null end))'
}

# .what = the rows that still wait on an answer
# .why  = a reply round starts from "what have i not answered?", and a release
#         refuses on that same list. the rule:
#         - an answer = a signed comment: its body opens with 🐢 and ends with
#           the key claim that `git.pull.comment set` writes. the signature, not
#           the login, judges it, so every mode and every credential agree
#         - a review thread waits when its latest comment is no answer and the
#           thread is not resolved; a bot's comment that is no answer is dropped
#           first, so a bot neither asks nor buries a human's question
#         - a human issue comment waits until an answer keyed `answer-<its id>`
#           exists; an unrelated keyed comment answers no one
# .note = a review row keeps its thread root in in_reply_to, or is the root
#         itself, so `--reply-to <id>` answers it. asked_again marks a
#         thread that already holds an answer
# .note = each row carries answer_key = `answer-<its id>`: the one key that
#         answers an issue comment, and a key unique to each review ask, so a
#         re-asked thread never reuses (and so edits) a prior answer
as_rows_unanswered() {
  printf '%s' "$1" | jq -c --arg sig "$COMMENT_SIGNATURE" '
    def is_bot: (.author // "") | endswith("[bot]");
    def is_answer: .key != null and ((.body // "") | startswith($sig));
    def answer_key_of: "answer-\(.id)";
    ( [ .[] | select(.kind == "review") ]
      | group_by(.in_reply_to // .id)
      | map( (map(select(is_answer or (is_bot | not))) | sort_by(.created_at, .id)) as $thread
        | select(($thread | length) > 0)
        | ($thread | last) as $latest
        | select(($latest | is_answer | not) and $latest.thread != "resolved")
        | $latest + { asked_again: ($thread | any(is_answer)), answer_key: ($latest | answer_key_of) } ) ) as $reviews
    | ( [ .[] | select(.kind == "issue" and is_answer) | .key ] ) as $keys
    | ( [ .[] | select(.kind == "issue" and (is_answer | not) and (is_bot | not))
          | (answer_key_of) as $k | select($keys | index([$k]) | not)
          | . + { asked_again: false, answer_key: $k } ] ) as $issues
    | $reviews + $issues | sort_by(.created_at, .id)'
}

# .what = how many rows a row list holds
# .why  = the gate counts the rows that wait; one name for the count
as_count_of_rows() {
  printf '%s' "$1" | jq 'length'
}

# .what = "true" when any row is a review row, else "false"
# .why  = only a review thread can be resolved, so only a review row that
#         waits offers that cure; prints the word, so a jq failure stays loud
is_any_review_row() {
  printf '%s' "$1" | jq 'any(.[]; .kind == "review")'
}
