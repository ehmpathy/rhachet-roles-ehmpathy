# F1 · upsert key = hidden html marker, author-scoped

- fork: (a) the draft's findsert by body sha256 · (b) a caller-named key, kept as `<!-- rhx:github.comment key=<k> -->` at the body tail, matched only among the current auth identity's comments
- taken: (b). the wish says "upserts a comment (idempotent on a key the caller names)". (a) cannot edit: a changed body hashes new and posts a twin
- rework: clean now. once comments with the marker exist in the wild, a format change must still read the old marker — dirty after ship
- confidence 75%, low because: the marker format is a guess; a notification email's plain-text part may show the raw marker to a reviewer (inventory row 26), unchecked until execution; another author on one key is refused (case=7) rather than adopted, which the wisher may prefer otherwise
- where: `1.vision.yield.md` .the contract · case=2, case=3, case=7
