# F3 — top-level (issue) comments count

## .the fork
the wish says "review comment", yet names "path:line or the top-level thread". #1171 says "every review comment thread and every issue comment". options: (a) list issue comments too, with a top-level `--key` answer command; (b) review comments only.

## .taken, why
(a). "the top-level thread" only makes sense for issue comments, and the gate counts them. `--reply-to` takes a review comment id only, so an issue row names a top-level `--key answer-<id> --from <file>` (key per F8).

## .rework, why
clean: a filter in one function, and one branch in the row render.

## .confidence, why low
80%. "review comment" in the title could mean review-only.

## .where
the shared operation (F1); the hint render in set
