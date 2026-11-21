# F7 — the full role still reads +155 after F6: its ref roster lists 101's rows

## the fork

after F6 (ruled B), `roles cost --repo ehmpathy --role mechanic` reads 27,913 against the 27,758
baseline (+155). no 101 row is new to the boot: every ref row already sits in `subject.code.prod`,
and the class clamp proves no 101 say row is held at ref elsewhere.

evidence (`npx rhachet roles boot --repo ehmpathy --role mechanic`): the boot's one
`<briefs.ref>` roster (lines 2366–2452) lists all fourteen of 101's rows, say rows included —
e.g. `code.prod/pitofsuccess.errors/rule.require.failfast.md` at line 2389 — while the say block
emits the `.min` twin (e.g. `rule.require.idempotent-procedures.md.min`, line 1432). best read: the
roster de-dups against the say block by path, and the `.min` swap leaves the plain `.md` path
unmatched, so each row is named twice.

options:
- A. ship as is; the full role reads +155 (27,913 / 30,000) until rhachet de-dups the roster
  across the `.min` swap.
- B. drop 101's ref rows; the full role shrinks some, but a seat that boots 101 alone loses the
  args and demos behind its cues (wish item 5: "args/demos at ref").
- C. diagnose and fix the de-dup in rhachet (another repo — the in-flight rhachet crew's lane).

measured (5.1 i005, rhachet main `1d747fd`, src view, one edit at a time, then restored):

| `subject.101` in boot.yml | tokens | say batches | ref batches |
|---|---|---|---|
| absent | 29,156 | 98 | 3 |
| say rows only | 29,274 (+118) | 98 | 3 |
| say + ref rows (shipped) | 29,311 (+155) | 98 | 3 |

the say-batch count never moves, so 101 adds no brief body to the full boot; all +155 is ref-roster
text — 118 from the seven say rows named again in the roster, 37 from the ref rows. the linked view
reads +155 too (27,758 → 27,913), on 1.50.0 and on main alike.

the render fact, read from the full boot's `<briefs.ref>` roster:
- a say row that two sections declare by one path boots once as say, and the second claim is listed
  in the roster. `failloud.md` proves it: it has no `.min`, its path is identical in code.prod and
  101, and it is still listed (+118 across the seven say rows)
- a ref row whose brief another section says is listed when the say emits the `.min` twin and the
  ref names the plain `.md` — `qualified-error-headers`, `idempotent-procedures` (+37)

the in-repo route tried, and refuted (5.1 i006, built, linked view):
- 101's rows named by their `.md.min` path: full role 27,773 (+15, failloud alone left). but
  `roles boot --subject 101` then emitted only `failloud` as say, and the clamp's slice fell to
  817 tokens: rhachet boots no say row declared by a `.md.min` path, and says naught of it. the
  cut was the six rows that no longer boot. reverted; 27,913 and 2,497 restored, suites green.
- no other route here reaches 0 while 101 keeps its seven say rows (wish item 3): each row is a
  say claim code.prod already holds, and the roster lists every second claim.

⇒ 0 is reachable only in rhachet's render: skip a roster row for any path (or its `.min` twin)
that the boot already emits as say. two defects for the rhachet tree: that roster de-dup, and the
silent drop of a `.md.min` say path (it should fail loud, or boot the twin).

## taken, and why

A. wish item 5 ("no change to the full role") can be met only by C, which is outside this repo;
B trades 101's own contract for a 0.6% cut to the full role. the diagnosis is a best read, not
proven inside rhachet, so C is caught as a dream for the rhachet crew.

## rework

clean — B is a deletion of seven ref rows; C lands upstream with no change here.

## confidence, and why it is low

90%. the probes prove the +155 is roster text, not brief content, and that no in-repo route
reaches 0 with 101 intact; the exact line in rhachet's render is not traced.

## where

`src/domain.roles/mechanic/boot.yml`, `subject.101.briefs.ref`; cause in rhachet's boot render.

## verdict

efficiency director, 2026-10-21: wish item 5 stands — the owed outcome is a full-role delta of 0,
measured. reach 0 here if this repo can; if the +155 is a rhachet render fact, record it and the
director dispatches the render fix to the rhachet tree (`feat-enroll-role-subject-focus`). do not
halt on it.

taken: A. 0 is not reachable here (above); 101 ships at +155, and the render fix rides to rhachet.
once it lands, the full role reads 27,758 with no edit in this repo.
