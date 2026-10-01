/**
 * .what = snapshot preparation operations for git.release tests
 * .why = ensures deterministic snapshots by variable content replacement
 */

// ============================================================================
// time operations
// ============================================================================

/**
 * .what = replace elapsed time values with placeholders
 * .why = times vary between runs, placeholders ensure determinism
 */
export const asTimeReplaced = (input: string): string => {
  return input
    // replace "Xm Ys" format (e.g., "2m 30s")
    .replace(/\d+m\s*\d*s?/g, 'Xm Ys')
    // replace "Xs" format (e.g., "45s")
    .replace(/\d+s/g, 'Xs')
    // replace ISO timestamps
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z/g, 'YYYY-MM-DDTHH:mm:ss.sssZ');
};

// ============================================================================
// url operations
// ============================================================================

/**
 * .what = replace run IDs in URLs with placeholders
 * .why = run IDs vary between executions
 */
export const asUrlReplaced = (input: string): string => {
  return input
    // replace run IDs in github URLs
    .replace(/\/runs\/\d+/g, '/runs/XXX')
    // replace PR numbers in URLs
    .replace(/\/pull\/\d+/g, '/pull/XX');
};

// ============================================================================
// ansi operations
// ============================================================================

/**
 * .what = strip ANSI escape codes from output
 * .why = ANSI codes vary by terminal, removal ensures consistent snapshots
 */
export const asAnsiStripped = (input: string): string => {
  // eslint-disable-next-line no-control-regex
  return input.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
};

/**
 * .what = convert ANSI codes to readable markers
 * .why = some tests want to verify ANSI style is applied
 */
export const asAnsiMarked = (input: string): string => {
  return input
    // mark dim/reset sequences
    .replace(/\x1B\[2m/g, '[dim]')
    .replace(/\x1B\[0m/g, '[/dim]');
};

// ============================================================================
// poll operations
// ============================================================================

/**
 * .what = the scrubbed duration tokens a poll line can carry
 * .why = format_duration renders "0s" under 60s and "1m 5s" above; the time
 *        scrub turns them into "Xs" and "Xm Ys", one claim in two forms
 */
const POLL_DURATION = /Xm Ys|Xs/g;

/**
 * .what = a poll line with its durations masked
 * .why = a duration is a CLOCK read; the rest of the line is the claim. group a
 *        run on the claim alone, so a run collapses whether the clock rendered
 *        "Xs" or "Xm Ys". see rule.require.hermetic-tests.
 */
const asPollShape = (line: string): string =>
  line.replace(POLL_DURATION, 'Xt');

/**
 * .what = collapse a run of poll lines of one shape after the 3rd one
 * .why = poll count varies with time; show first 3, collapse rest
 */
export const asPollCollapsed = (input: string): string => {
  const lines = input.split('\n');
  const collapsedLines: string[] = [];
  let lastPollLine: string | null = null;
  let lastPollShape: string | null = null;
  let pollCount = 0;

  const flushPollLines = () => {
    if (lastPollLine === null || pollCount === 0) return;
    // show up to 3 poll lines, collapse rest
    const showCount = Math.min(pollCount, 3);
    for (let i = 0; i < showCount; i++) {
      collapsedLines.push(lastPollLine);
    }
    if (pollCount > 3) {
      // extract lead whitespace for indentation
      const indent = lastPollLine.match(/^(\s*)/)?.[1] ?? '';
      collapsedLines.push(`${indent}├─ ... (Nx more)`);
    }
    lastPollLine = null;
    lastPollShape = null;
    pollCount = 0;
  };

  for (const line of lines) {
    // a poll line carries 💤 plus a scrubbed duration, "Xs" or "Xm Ys"
    const isPollLine = line.includes('💤') && POLL_DURATION.test(line);
    POLL_DURATION.lastIndex = 0; // the /g flag makes .test stateful

    if (isPollLine) {
      const shape = asPollShape(line);
      if (shape === lastPollShape) {
        // same claim, a later clock — count it, do not start a new run
        pollCount++;
      } else {
        // new poll line pattern, flush previous if any
        flushPollLines();
        lastPollLine = line;
        lastPollShape = shape;
        pollCount = 1;
      }
    } else {
      // non-poll line, flush any queued poll lines
      flushPollLines();
      collapsedLines.push(line);
    }
  }

  // flush any left poll lines
  flushPollLines();

  return collapsedLines.join('\n');
};

// ============================================================================
// full preparation
// ============================================================================

/**
 * .what = prepare output for snapshot comparison
 * .why = single function for consistent snapshot preparation
 */
export const asSnapshotReady = (input: string): string => {
  let result = input;
  result = asAnsiStripped(result); // strip ANSI first so time regex does not match [2m, [0m
  result = asTimeReplaced(result);
  result = asUrlReplaced(result);
  result = asPollCollapsed(result);
  return result;
};

/**
 * .what = prepare output for snapshot but preserve ANSI markers
 * .why = some tests want to verify hint style is applied
 */
export const asSnapshotReadyWithAnsi = (input: string): string => {
  let result = input;
  result = asAnsiMarked(result); // mark ANSI first so time regex does not match [2m, [0m
  result = asTimeReplaced(result);
  result = asUrlReplaced(result);
  result = asPollCollapsed(result);
  return result;
};
