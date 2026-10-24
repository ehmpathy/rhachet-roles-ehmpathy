# F16 · render polish held past the l3 budget

## the fork

- **taken:** ship the verbs' render as it stands after i006, with these held: `issue comment` as the row term (the target line glosses it `top-level comment`); rows sorted by creation time, a reply not nested under its root; a no-op's json keeps `method` and `endpoint` (the write it would send); a pr description edit writes the text as given, no 🐢 prefix, by design; the full 64-hex hash on both `new` and `read-back`; `(gh cli login, fallback)` from the shared `git.commit` vocab; input-shape fixes with `<…>` and `...` placeholders; `next` for a malfunction's hint label beside `to fix it` for a constraint's; the get usage line's one bracket of alternatives
- **not taken:** rework each before merge

## why, at the time

- the l3 lanes ran their three rounds; every blocker they raised is repaired, and these points are `[nitpick][better]` by the reviewer's own grade, with no nameable shipped harm
- `issue` is github's own api word and the `--kind` value, so the row, the flag, and github's docs say one word; nested threads and a short hash are render changes with no contract weight
- the `method`/`endpoint` on a no-op json is the edit it would send, which the tree names too ("an edit would PATCH …"); the verdict field is what a caller branches on
- a pr description belongs to its author's voice: set replaces it whole and never prefixes it; the vision chose that (case=1)
- `(gh cli login, fallback)` is `get_auth_who_label` in `git.commit.operations.sh`, shared with `git.commit.push`; a change there belongs to that skill's own pr
- a placeholder fix names the shape of the input the verb lacks; a pasteable command needs a value the verb does not have

## rework

clean. each is a render string or a sort, with no caller hardened against it.

## confidence: 80%, and why it is not higher

two reviewers on two rounds read the tree as a product surface and asked for each; a human may weigh the polish above the merge.

## where

5.3.verification, peer review i006 (r11 nitpicks 6–12, 14, 16; r10 nitpick 3).

## verdict

open; best-guessed, for the council.
