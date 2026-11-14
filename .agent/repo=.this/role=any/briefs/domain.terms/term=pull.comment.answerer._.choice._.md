# domain.term: answerer

term.chosen   = answerer
term.kind     = noun
term.boundary = pull.comment
term.synonyms.forbidden:
- responder
- owner
- reviewee

## .what
one whose reply in a pr comment thread clears what came before it: the robot (current login, body opens 🐢), or the pr author. a comment **awaits a reply** while no answerer has posted after it in its thread. every other human is an **asker**.

## .refs
- src/domain.roles/mechanic/skills/git.pull.comment/git.pull.comment.operations.sh (`as_comment_rows_unanswered`: `is_answerer`, `is_asker`)
- `rhx git.pull.comment.get --unanswered`
- the 🥥 hint after `rhx git.pull.comment.set --mode apply`

## .reason
- `term=pull.comment.answerer._.choice.reason.md`
