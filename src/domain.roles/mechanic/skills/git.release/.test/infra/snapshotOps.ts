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
// full preparation
// ============================================================================

/**
 * .what = prepare output for snapshot comparison
 * .why = single function for consistent snapshot preparation
 */
export const asSnapshotReady = (input: string): string => {
  let result = input;
  result = asTimeReplaced(result);
  result = asUrlReplaced(result);
  result = asAnsiStripped(result);
  return result;
};

/**
 * .what = prepare output for snapshot but preserve ANSI markers
 * .why = some tests want to verify hint style is applied
 */
export const asSnapshotReadyWithAnsi = (input: string): string => {
  let result = input;
  result = asTimeReplaced(result);
  result = asUrlReplaced(result);
  result = asAnsiMarked(result);
  return result;
};
