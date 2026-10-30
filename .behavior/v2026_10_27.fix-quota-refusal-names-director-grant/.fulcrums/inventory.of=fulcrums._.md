# fulcrum inventory

| case | title | rework | risk | status | confidence |
|---|---|---|---|---|---|
| F1 | how a tree is known to have a director | dirty | **high**: a cross-repo contract (nheuron writes, this repo reads); a miss re-creates the incident, a false hit tells a human to ask a director that does not exist | unresolved — a blueprint call; options + lean A (charter granted in the tree) go to the commander | 60% on the lean |
| F2 | refusals in scope | clean | **medium**: three refusals × four surfaces, json mode on push included; each needs a variant and a clamp | ruled: widen to push-not-allowed and no-quota-set, set and push included | 100% (ruled) |
| F3 | amend the briefs that say a human grants quota | clean | **low**: a two-line brief edit; `.min` must match its source | ruled: amend this repo's brief in this pr; bhrain → reseed dream | 100% (ruled) |
| F4 | skip detection, name both granters | clean | **low**: not built | ruled: no; keep detection | 100% (ruled) |
| F5 | where `git.crew.grant` lives, who runs it | clean | **medium**: the printed command lives in another repo, flags read from logs, not source; a flag rename goes stale silently | ruled: nheuron role=director; the director runs it; the driver asks | 100% (ruled) |
| F6 | the stage refusal (`git.stage.add`) | clean | **low**: two sites in one skill; the grant line needs `--stage allow` instead of `--push allow`, so `get_one_director_grant_command` gains one arg | open — found at execution; not wired, since F2's verdict named three refusals. lean: wire it in this pr on the director's word | 70% on the lean |
