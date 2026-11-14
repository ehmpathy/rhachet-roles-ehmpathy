# F7 — a review row names the first comment that opened the wait

## .the fork
a review thread may hold several human words after the last answer (kai asks, reef-nalu adds "+1"). options: (a) one row per thread, named by the thread's latest comment (extant `last`); (b) one row per thread, named by the first human comment after the last answer; (c) one row per comment that awaits.

## .taken, why
(b). the first word after the last answer is the question that opened the wait. a "+1" is no question. one reply answers the whole thread, so one row per thread. `--reply-to <that id>` joins the thread root (`get_thread_root_id`). case21's thread 904 (kai, robot, kai) names 906 under both (a) and (b), so its expected ids hold. issue rows stay one per comment that awaits, as extant: top-level notes are separate remarks.

## .rework, why
clean: one jq selector.

## .confidence, why low
72%. the wish says "one line each" per comment, which leans toward (c).

## .where
the shared operation (F1)
