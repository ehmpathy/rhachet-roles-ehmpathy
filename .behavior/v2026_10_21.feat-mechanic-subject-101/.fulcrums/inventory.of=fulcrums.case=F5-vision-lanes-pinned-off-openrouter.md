# F5 — the 1.vision peer lanes moved off the OpenInference host

## the fork

both lanes ran on the default `openrouter/deepseek/flash`, routed to the OpenInference host, which
returned `400 Request could not be processed` on every call (i001, i002). the efficiency director
granted one guard repair: move the lanes off that host; no budget edit, no `--paths` narrow, no lane
dropped or made optional.

tried, in order:
- `anthropic/claude/code/sonnet` (i003) — the cli exited 1, no stderr.
- `xai/grok/4` (i004) — `supplier.creds is not a function` in `rhachet-brains-xai@0.3.3`
  (`getSdkXaiCreds.js:14`): the package calls `creds()`; rhachet 1.50.0 supplies it as data.
- `anthropic/claude/sonnet` — not tried: it reads only `process.env.ANTHROPIC_API_KEY`, unset here.
- `openrouter/z-ai/flash` (i005) — the same keyrack-wired openrouter supplier, another upstream host.
  both lanes rendered verdicts.

## taken, and why

`--brain openrouter/z-ai/flash` on both lanes, plus a three-line comment in the guard. it is the one
path whose credentials are wired in this repo's install, on a host other than the one that 400s.
rubric, refs, bind, budget (3), and level (1) unchanged; i005 and i006 show each lane still reports
counts that gate (i005: 9 nitpicks held the stone over the 7 cap).

## rework

clean — drop the flag once rhachet-ktlo repairs the OpenInference path.

## confidence, and why it is low

90%. z-ai/flash is a different model than the template author calibrated against; its grades may
drift from deepseek's.

## where

`1.vision.guard`, both `peer` lanes.

## verdict

granted by the efficiency director, 2026-10-21.

## retire

the pin is a patch, not a design. the OpenInference 400 has since cleared: at 5.1 i003 all eight
l1 lanes rendered on the default `openrouter/deepseek/flash`, with no guard edit. retire = drop
`--brain openrouter/z-ai/flash` and its comment from `1.vision.guard`. it needs the route mutate
grant (human-owned), and 1.vision is passed, so the pin rests inert until then. the openrouter cure
itself stays rhachet-ktlo's lane.
