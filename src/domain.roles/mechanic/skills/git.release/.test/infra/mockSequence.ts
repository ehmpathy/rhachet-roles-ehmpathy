/**
 * .what = watch poll sequence generator for git.release tests
 * .why = generates stateful mock sequences for watch loop tests
 */

// ============================================================================
// types
// ============================================================================

export type SequenceState = 'inflight' | 'passed' | 'failed' | 'merged';

export interface SequenceStep {
  state: SequenceState;
  progress?: number;
}

export interface WatchSequence {
  steps: SequenceStep[];
}

// ============================================================================
// predefined sequences
// ============================================================================

/**
 * .what = predefined watch sequences for common scenarios
 * .why = ensures at least 3 poll cycles as required by spec
 */
export const SEQUENCES = {
  // 3 polls: inflight → inflight → inflight → passed → merged
  inflightToPassed: {
    steps: [
      { state: 'inflight', progress: 1 },
      { state: 'inflight', progress: 1 },
      { state: 'inflight', progress: 1 },
      { state: 'passed', progress: 0 },
      { state: 'merged', progress: 0 },
    ],
  } as WatchSequence,

  // 3 polls: inflight → inflight → inflight → failed
  inflightToFailed: {
    steps: [
      { state: 'inflight', progress: 1 },
      { state: 'inflight', progress: 1 },
      { state: 'inflight', progress: 1 },
      { state: 'failed', progress: 0 },
    ],
  } as WatchSequence,

  // already passed, immediate merge
  alreadyPassed: {
    steps: [
      { state: 'passed', progress: 0 },
      { state: 'merged', progress: 0 },
    ],
  } as WatchSequence,

  // already merged
  alreadyMerged: {
    steps: [{ state: 'merged', progress: 0 }],
  } as WatchSequence,

  // tag workflows: 3 polls then success
  tagInflightToPassed: {
    steps: [
      { state: 'inflight', progress: 1 },
      { state: 'inflight', progress: 1 },
      { state: 'inflight', progress: 1 },
      { state: 'passed', progress: 0 },
    ],
  } as WatchSequence,

  // tag workflows: 3 polls then failure
  tagInflightToFailed: {
    steps: [
      { state: 'inflight', progress: 1 },
      { state: 'inflight', progress: 1 },
      { state: 'inflight', progress: 1 },
      { state: 'failed', progress: 0 },
    ],
  } as WatchSequence,
};

// ============================================================================
// sequence generator
// ============================================================================

/**
 * .what = generate a custom watch sequence
 * .why = allows tests to specify exact poll sequence
 */
export const genWatchSequence = (input: {
  pollCount: number;
  terminal: 'passed' | 'failed' | 'merged';
}): WatchSequence => {
  const { pollCount, terminal } = input;

  const steps: SequenceStep[] = [];

  // add inflight steps
  for (let i = 0; i < pollCount; i++) {
    steps.push({ state: 'inflight', progress: 1 });
  }

  // add terminal step
  if (terminal === 'passed') {
    steps.push({ state: 'passed', progress: 0 });
    steps.push({ state: 'merged', progress: 0 });
  } else if (terminal === 'failed') {
    steps.push({ state: 'failed', progress: 0 });
  } else {
    steps.push({ state: 'merged', progress: 0 });
  }

  return { steps };
};
