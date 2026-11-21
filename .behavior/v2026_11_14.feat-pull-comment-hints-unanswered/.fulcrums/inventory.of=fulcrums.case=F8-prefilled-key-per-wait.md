# F8 — the hint prefills the key as `answer-<row id>`

## .the fork
the wish's command reads `--key <k>`, a placeholder. the house coconut rule asks for a last line with no placeholder to decode. options: (a) keep `<k>`; (b) prefill `answer-<id>`, where id = the row's comment id (the first human word after the last answer, F7).

## .taken, why
(b). one less slot to invent per reply. the row id makes the key safe: a re-ask is a new comment with a new id, so its key is new, and the set POSTs a new reply. a key reused from the prior answer would PATCH the old one. an edit is no later reply, so the thread would stay listed forever (case=6 t4).

## .rework, why
clean: one string in the row render.

## .confidence, why low
80%. the wish wrote `<k>`. a robot that already keys answers its own way may ignore the suggestion, which is harmless.

## .where
the hint render in set
