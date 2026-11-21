# F9 — a comment by an app bot (`user.type == "Bot"`) never awaits

## .the fork
the wish's rule lists any comment not answered by the robot or the pr author. on a real pr (ehmpathy/rhachet-roles-ehmpathy#1022), `rhelease[bot]` (`type: Bot`) leaves issue comments. under the literal rule those would await forever, on every pr the release bot touches. options: (a) the literal rule; (b) skip authors whose `user.type` is `Bot`.

## .taken, why
(b). an app bot asks no question a reply can settle; it is a status report. #1171 also scopes its gate to "a human comment". the robot itself reads `type: User` (keyrack.operations.sh notes the same), so (b) never hides a robot or human word.

## .rework, why
clean: one jq predicate, plus `user.type` on the row.

## .confidence, why low
82%. some app bot may one day ask a real question; the literal wish did not carve this out.

## .where
the shared operation (F1); `shape` must carry the author type
