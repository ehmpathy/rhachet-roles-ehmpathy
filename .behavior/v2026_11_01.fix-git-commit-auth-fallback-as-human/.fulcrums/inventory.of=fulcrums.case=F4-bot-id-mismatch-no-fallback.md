# F4 — bot-id mismatch stays a hard stop

## .the fork
two guards exit 2 on a token whose identity diverges from the commit author (`assert_token_identity_in_sync`, the `PR_OPENER_NAME != HEAD_AUTHOR` check). their hint already names `--auth as-human`. options: (a) leave them as hard stops; (b) fold them into the fallback.

## .taken, why
(a). the wish scopes the fallback to "absent, or refused by gh". a mismatch is a misconfigured roster or token, which a human must see; a silent fallback would mask it forever.

## .rework, why
clean. one more branch into the fallback path if the wisher wants it.

## .confidence, why low
88%.

## .verdict
confirmed by the director at 1.vision approval (seed S3).

## .where
`git.commit.push.sh:536,573`.
