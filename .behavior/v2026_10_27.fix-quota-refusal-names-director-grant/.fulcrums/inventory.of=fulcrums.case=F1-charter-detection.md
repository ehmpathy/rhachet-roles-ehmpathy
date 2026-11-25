# F1: how a tree is known to have a director

## .the fork
the refusal branches on "a director governs this tree", answered from inside the driver's tree,
by a skill in this repo. options, with what holds each up today:

| option | what the skill reads | exists today? | misses |
|---|---|---|---|
| A | a charter granted in the tree: `.agent/.charter/<who>.granted.md`, or `.agent/repo=.this/role=<who>/briefs/charter.granted.md` | yes. `git.crew.seat hire --tree <tree> --who <who> --charter <file>` ships it into the seated tree, git-excluded (nheuron `crewwork.sh:4002-4016`, `:4020-4098`, `:4221-4227`) | a tree whose crew was booted with no seat hired; a tree whose charter was removed by `fell` |
| B | a field on `.meter/git.commit.uses.jsonc` that `git.crew.grant` writes (e.g. `grantedBy: director`) | no; needs a change to `git.crew.grant` (nheuron) and the meter schema (this repo) | `quota-absent` (C3): no file before the first grant, so the absent refusal cannot tell |
| C | an env var the crew boot sets in the driver's session | no; needs a change to crew boot | any process outside the booted session (a reboot, a manual shell, a subagent with a scrubbed env) |
| D | the director's seat registration record (tree, who, charter, grove) | yes, but it lives in the director's grove (`crewwork.sh:3808-3826`), not in the driver's tree | unreadable from the driver's tree without a path to the grove |

## .lean (for the blueprint; not a verdict)
A. it is the only option that exists today, sits in the driver's own tree, and names the charter the
wish names ("a director charter governs the tree"). it covers every D2 refusal, absent quota
included, since the charter arrives at hire, before any grant.
open sub-questions for the commander under A: does any charter granted imply a director, or only
one granted by a director seat? and the exact glob this repo commits to read.

## .rework
dirty: whichever option lands becomes a cross-repo contract (nheuron writes, this repo reads). a
change of path or shape in nheuron breaks detection silently, unless a clamp pins it.

## .confidence
lean A at 60%: the evidence is from nheuron source on origin/main; the "which seat implies a
director" question is unresolved.

## .where
`1.vision.yield.md` open question 1; every C1, C3, C4, C14 surface.

## .owed once the commander rules
until then the director line is inert (every tree reads `none`), and the pr is not ready to merge.
- the detector body in `get_one_tree_director_state` (`git.commit.director.operations.sh`) reads the
  ruled marker, and answers `unreadable` where the marker exists but cannot be read
- detection and render split apart; the test-only `director=` arg retires
- the skill-level test (`git.commit.director.operations.skills.integration.test.ts`) plants a real
  marker in place of its detector override, so all five skills run end to end against a fixture
- a clamp pins the marker path this repo commits to read
- the json `fix` field takes its structured shape, `{ grantor, command }` (F12)
- the skill-level suite stays green in all three states; its `charter` and `unreadable` scenes then
  plant a fixture instead of the override

## .verdict
director, 2026-10-30: a blueprint call. itemize the options with a lean in the blueprint; the
commander rules, never best-guessed. unresolved until then.

director, 2026-10-30 (later): no blueprint stone. F1 goes to the commander as a three-line question
through the director's queue. execution builds all but the detection check itself; the check stays
unbuilt until the commander rules.

director, 2026-10-30 13:1xZ: sort it, WHAT or execution. driver's sort: **WHAT**. each option
draws a different set of trees that get the director line: A excludes a crew booted with no seat
hired; B excludes every tree before its first grant (C3); C excludes any process outside the booted
session; and A's own sub-question (any charter, or only a director-seated one) moves the line
again. the approved vision names the outcome ("a director charter governs the tree") but not that
set, so the choice is the commander's, as one ranked ask: A (lean), then B, C, D.
