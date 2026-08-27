# rule.prefer.scouts-honor

## .what

leave it better than you found it, when able. when you touch a file, make the small improvement
within reach — a cleaner name, a tighter comment, a wicked-up ramble, a dead line removed. the
boy scout rule: leave the campground cleaner than you found it.

this is opportunistic, not a mandate to refactor the world. you fix forward on what you already
touch, within the scope of the change you came to make.

## .why

- **decay compounds; so does care** — each small unmade fix invites the next. each made fix invites the next reader's.
- **you are already here** — the cost to grasp the file is paid once, at touch time. the marginal fix is cheap now, expensive later.
- **ye-olden authors rambled** — code and prose predate our rules. we do not fault the past; we fix forward when we pass through.
- **no big-bang cleanup needed** — a repo improves by many small in-scope fixes, not one heroic rewrite.

## .the bound — "when able"

scouts-honor is opportunistic, so it has edges:

- **in scope** — the fix rides the change you came to make; it does not balloon the diff.
- **safe** — the fix does not risk the behavior you are not here to touch (see `rule.require.review-test-changes`).
- **cheap** — a rename, a comment, a ramble cut, a dead-line delete. not a re-architecture.
- **if the fix is large** — note it, flag it, or open a follow-up. do not smuggle a refactor into an unrelated change.

so: make the cheap in-scope fix now; defer the costly one with a note.

## .what to fix forward

| you touch… | leave it better by… |
|------------|--------------------|
| a ramble in a comment/brief | wick it up (`lang.prose/rule.prefer.wickup-touched-prose`) |
| a vague name | rename to the domain term (`rule.require.ubiqlang`) |
| a dead line / stale comment | delete it |
| a time-ordered log in a doc | revise to current truth (`rule.forbid.chronological-accretion`) |
| an absent `.what`/`.why` header on a proc you edit | add it (`rule.require.what-why-headers`) |

## .the test

after your change, is the file a little better than before — beyond the fix you came for? if a
cheap, safe, in-scope improvement sat under your hands and you left it, you broke scouts-honor.

## .enforcement

- a cheap, safe, in-scope improvement left unmade in a file you edited = **nitpick**
- a large or out-of-scope cleanup smuggled into an unrelated change = **blocker** (that breaks `rule.require.review-test-changes`)

## .see also

- `lang.prose/rule.prefer.wickup-touched-prose` — the prose-specific instance of this trait
- `lang.prose/define.wick-dense` — the terse target a wicked-up ramble reaches
- `rule.require.review-test-changes` — the bound: do not change unrelated behavior unasked
- `code.prod/readable.comments/rule.require.timeless-comments` — the durable-comment fix-forward
