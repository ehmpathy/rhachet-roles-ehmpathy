# F12: the shape of the json `fix` field on `git.commit.push --output json`

## .the fork
in json mode a push refusal where the director state is known carries a `fix` field.

| option | the field | cost |
|---|---|---|
| A, rendered text | `"fix": "a director governs this tree; ask your director to grant push. the director runs:\n  $ rhx git.crew.grant …"` | a machine caller parses prose to learn who grants |
| B, structured | `"fix": { "grantor": "director" \| "human" \| "unknown", "command": "…" }` | a new public contract, shaped before the detector it describes exists |

## .taken, why
A, for now. the field appears only when a director state is known, and every tree reads `none` until
the detector lands, so no caller can meet the field today. its grantor vocabulary depends on what
detection can tell (F1: charter vs any marker), so the structured shape is better settled with the
detector than before it. A keeps one render for tree and json output.

## .rework
clean while inert: no caller can read the field until detection lands; a reshape then breaks no one.

## .confidence
75%: B is the better end state; the open part is only when to fix its vocabulary.

## .where
`git.commit.push.sh` (`emit_error … fix=`), `get_one_quota_grant_fix_for_json`; raised in 5.1 review
i007 (enroll-impl-arch-defects, item 3). on F1's `.owed` list.

## .verdict
none yet; best-guess A until the detector lands.
