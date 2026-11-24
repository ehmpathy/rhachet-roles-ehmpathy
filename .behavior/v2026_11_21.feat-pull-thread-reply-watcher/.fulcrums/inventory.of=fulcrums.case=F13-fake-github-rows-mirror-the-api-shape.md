# F13 · fake github rows mirror github's optional fields

## .the fork
- (a) make `WatchStoreComment`'s new fields and `genComment`'s inputs required, `| null` where absent
- (b) keep `in_reply_to_id?` and `pull_request_review_id?` optional on the fake row, and `genComment` a fixture factory that defaults what a case does not turn on

## .taken
(b).
- github omits `in_reply_to_id` on a root and `pull_request_review_id` where it does not apply; the fake store stands in for that external boundary, the exception `rule.forbid.undefined-inputs` and `rule.forbid.io-as-interfaces` name
- `genComment` exists so each case names only the fields its claim turns on; a required-null form adds five `null`s to each of ~60 calls and buries the field under test
- the new internal procedure input that had no such reason, `genReplyScene`'s `env`, was made `| null`

## .applies to
i001: arch-smell-scopeleaks nitpick.1 · arch-hazards-maintenance nitpick.1
i002: arch-hazards-behavior nitpick.1

## .rework
clean. test-only shapes.

## .confidence
80%.

## .verdict
open — for the council.
