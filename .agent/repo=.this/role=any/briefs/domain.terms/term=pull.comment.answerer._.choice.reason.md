# domain.term.choice.reason: answerer

## .etymology

the question every instance answers is "whose reply ends the wait?". *answerer* names that act. rejected:

| candidate | why not |
|---|---|
| `responder` | too wide: a peer's `+1` responds, yet clears naught |
| `author` | overloaded: every comment has an author; the pr author is one answerer, the robot another |
| `owner` | overloaded with CODEOWNERS, which names files, not threads |
| `maintainer` | a github role; a maintainer who did not open the pr does not clear a comment |
| `reviewee` | names the pr author alone and misses the robot |

the paired phrase in every rendered line is **await a reply**. the flag stays `--unanswered`: an extant contract, and the human's own word for the question.

## .evidence

### the instances it must cover

| who posts after a human comment | clears it? | why |
|---|---|---|
| the robot (current login, body opens 🐢) | yes | the robot answers on the pr author's behalf |
| the pr author, with no 🐢 | yes | the person who owes the reply gave it |
| a peer (`+1`, "same question") | no | a third voice adds weight; it settles naught |
| an app bot (`user.type == "Bot"`, e.g. `rhelease[bot]`) | no | a status note asks and answers no question |
| the current login with no 🐢, not the pr author | no | not the robot's voice; under `--auth as-human` that is a human, who is an asker |
| a maintainer who did not open the pr | no | a maintainer may review; the pr's author owes the reply |

the word covers rows 1–2 and excludes rows 3–6.

### five whys

| # | the question | the answer |
|---|---|---|
| 0 | what does the rule check? | who posted last in a thread |
| 1 | why who posted last? | a later reply may close an earlier question |
| 2 | why only some later replies? | a `+1` or a release note does not settle a question |
| 3 | why does a settled question matter? | a human approves "given the comments are addressed" |
| 4 | why does that approval need the truth? | a release that ships past an open question ships a defect (#693) |
| 5 | so whose reply counts? | the party who owes the reply: the pr's author, or the robot that speaks for them |

### invariants

- a comment by an answerer never awaits a reply
- a comment by an app bot never awaits a reply
- a resolved review thread awaits naught, whoever posted last
- a review thread's row is the first asker comment after its last answerer comment
- the top-level conversation is one thread: an answerer's top-level post clears every earlier top-level asker comment
- login match is `slug ≡ slug[bot]` (`is_same_login`): an app token's login and its comments' login may differ by that suffix

### where it was settled

`.behavior/v2026_11_14.feat-pull-comment-hints-unanswered`, vision fulcrums F2, F6, F9, F11 (each ruled or approved). the robot's half is auth-relative: under `--auth as-human` the current login is the human, so a bot reply clears a thread only when the bot opened the pr. a release gate may need an auth-free answerer set; that question belongs to the gate (#1171).

## .disputes

none raised.
