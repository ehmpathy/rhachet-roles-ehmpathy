# F15 · get shows the raw body; the json mirrors the flag and the api

## the fork

- **taken:** get prints each body exactly as github holds it, key marker included, and in full. the json row keeps `kind: "body"` (the value of `--kind body`) and `body` (github's own field for the text). json refusals carry the tree's detail and fix lines verbatim. the acceptance file proves dispatch through rhachet with `--help` and one input refusal per verb; the exit-0 journeys live in the integration suite
- **not taken:** hide the marker in get's text; cap a long body; rename the json `kind` value to `description` or the text field to `text`; strip tree labels out of the json `details` and `fixes`; drive exit-0 plans through rhachet with a gh stub on the linked repo's PATH

## why, at the time

- the raw body is what `sha256` and `bytes` describe, so a reader who checks the hash checks what they read. a body piped back into `set` round-trips: set strips any stale marker and writes the one `--key` names (case2 [t2])
- get is the read a human uses to see the text; a cap would hide the part they came to read
- `kind` round-trips into `--kind`; `body` matches every github api response a caller may also read. the tree is the human surface, and there `pr description` and `text` hold one sense each
- one text for json and tree means a json caller and a human read one message; the machine keys are `class` and `message`
- the exit-0 journeys need a gh stub and a stub keyrack; the integration suite drives all of them (179 cases). the acceptance file proves what only it can: registration and dispatch

## rework

clean. each is a render or a test add, with no caller hardened against it.

## confidence: 85%, and why it is not higher

r11 raised the marker, the json labels, and the thin acceptance file on two rounds; a reviewer who reads the tree as the only surface may still prefer the marker hidden.

## where

5.3.verification, peer review i005 (r11 blocker.3 json half, nitpick.2, nitpick.3, nitpick.5).

## verdict

open; best-guessed, for the council.
