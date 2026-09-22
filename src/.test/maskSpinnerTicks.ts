/**
 * .what = masks the COUNT of a skill's progress-spinner ticks in captured
 *         output, so a snapshot pins the spinner's shape and not the host's
 *         wall clock
 *
 * .why  = a long-running skill emits one `💤 inflight` line per poll
 *         interval, so the count is a function of how long the work took —
 *         a loaded runner emits five where an idle one emits one. a
 *         snapshot that pins the count therefore grades the runner's load
 *         (`rule.require.hermetic-tests`), and reds on a busy host with no
 *         defect behind it.
 *
 * .note = it MASKS, it does not strip. the ticks are the illustration the
 *         snapshot exists for — a reader is meant to see that the skill
 *         reports progress while it waits, and what that render looks like.
 *         ⇒ the first tick renders verbatim and the rest collapse into one
 *         `__xN__` line that keeps the tree prefix, the same way every other
 *         dynamic value in these suites is masked (`(Xs)`,
 *         `/tmp/__sanitized__`, `at __stack__`).
 *
 * ⚠️ .why the mask rides along even on a run of ONE = the run length is the
 *         quantity that varies, so a mask emitted only at two-or-more would
 *         itself be load-dependent — a fast host would render one line where
 *         a slow host rendered two, and the snapshot would flake on exactly
 *         the axis this masks. ⇒ a run of one and a run of seven must render
 *         alike, so the pair is always emitted.
 *
 * @example
 *   in:  `   │  ├─ 💤 inflight (0s)`     in:  `   │  ├─ 💤 inflight (0s)`
 *        `   │  ├─ 💤 inflight (5s)`
 *        `   │  ├─ 💤 inflight (10s)`
 *   out: `   │  ├─ 💤 inflight (0s)`     out: `   │  ├─ 💤 inflight (0s)`
 *        `   │  ├─ 💤 inflight __xN__`        `   │  ├─ 💤 inflight __xN__`
 */
const TICK = '💤 inflight';
const MASK = '__xN__';

export const maskSpinnerTicks = (output: string): string =>
  output
    .split('\n')
    .reduce<string[]>((kept, line) => {
      // a non-tick line closes any run, and passes through untouched
      if (!line.includes(TICK)) return [...kept, line];

      // a tick that continues a run folds into the mask already emitted
      const linePrior = kept[kept.length - 1] ?? '';
      if (linePrior.includes(TICK)) return kept;

      // the first tick of a run renders verbatim, and always carries the
      // mask beside it — so the pair reads the same at any run length
      const prefix = line.slice(0, line.indexOf(TICK));
      return [...kept, line, `${prefix}${TICK} ${MASK}`];
    }, [])
    .join('\n');
