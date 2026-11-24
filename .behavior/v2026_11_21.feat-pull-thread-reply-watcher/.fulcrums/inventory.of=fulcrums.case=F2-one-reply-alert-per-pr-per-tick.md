# F2 · reply tasks lead the one alert of each read

## .the fork
- (a) one `clone say` per thread
- (b) one alert per pr per read, as today (A9): the reply tasks lead it, one section per unanswered thread, each with its own reply command; code events follow
- (c) a reply alert of its own, apart from the alert that carries ci, approval, and other comment events

## .taken
(b). two reads decide it:
- the commander reviews in bursts: 6 roots in 5 min on #1222 (11-06), and 8 roots on #1143 drafted over 12 minutes and submitted at one instant, so one read sees all 8. (a) queues 6–8 messages into a busy crew
- A9 (`git.pull.watch.alert.sh:136`) has no read against it: no data shows a reply delayed because it shared an alert with a code event. (c) would push back on A9 with no stat, so A9 holds. (b) still makes the reply its own task: its own section, its own command, first in the alert and named first in the header

(b) also needs no outbox order across two alerts of one read, which (c) would.

## .rework
clean. (a) or (c) is one more outbox entry per read.

## .confidence
70%. "as its own task" may mean a separate alert, or one per thread.

## .where
`1.vision.yield.md` § the contract · `case=5.review-burst-beside-a-red-check`

## .verdict
open — for the wisher at vision review.
