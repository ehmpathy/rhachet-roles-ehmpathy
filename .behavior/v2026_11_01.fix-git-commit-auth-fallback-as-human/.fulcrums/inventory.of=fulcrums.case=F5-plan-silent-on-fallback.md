# F5 — plan mode stays silent on the fallback

## .the fork
plan fetches no token and calls no gh, so it cannot know if a fallback will fire. options: (a) plan renders `opened: as-ehmpath` as today; (b) plan adds "(falls back to as-human)"; (c) plan probes the keyrack.

## .taken, why
(a). (c) adds a keyrack mutation (unlock) to a preview. (b) adds noise to every plan for a rare branch; the apply render names the real outcome.

## .rework, why
clean. one label change.

## .confidence, why low
85%.

## .where
`git.commit.push.sh:439`.
