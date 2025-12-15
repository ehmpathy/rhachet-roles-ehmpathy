import type { PonderCatalog } from '@src/_topublish/rhachet-roles-bhrain/src/domain/objects/PonderCatalog';

export const enquestionPonderCatalog = {
  contextualize: {
    P0: [
      'what exactly is the goal in one sentence, and what is explicitly out of scope?',
      'what constraints bind us (time, data, risk, budget, authority)?',
      'what is already known, suspected, or assumed?',
      'what is unknown or high-uncertainty — and does it matter?',
      "what does 'good enough' look like?",
      'what must be true for the result to be useful tomorrow?',
    ],
    P1: [
      'who is the decision-maker or beneficiary, and what do they value most?',
      'what resources are available to answer questions?',
      'what are the failure modes if we ask the wrong questions?',
    ],
    P2: [
      'what vocabulary must be standardized before we proceed?',
      'what is the time/energy budget for questioning vs doing?',
    ],
    P3: ['when should we revisit or broaden the question set?'],
  },
  conceptualize: {
    P0: [
      'how can we decompose the goal into subgoals?',
      'which interrogative primitives map to each subgoal (what/why/how/who/when/where/which)?',
      'which questions rank highest by value of information (impact × tractability × urgency)?',
    ],
    P1: [
      'what candidate buckets should we consider (clarify, measure, compare, decide, risk-check, assumption-test, path-select)?',
      'in what order should these buckets be addressed to break dependencies?',
      'what is the minimal viable question set we can execute now?',
      'for each question, what evidence will answer it (source, method, acceptance signal)?',
    ],
    P2: [
      'for each question, which focus.motion maneuver will we invoke (e.g., what↔<articulate>, why↔causal chain, how↔<decompose>)?',
      'how should we encode the outputs for downstream execution (human or machine)?',
    ],
    P3: [
      'under what signals should we widen, narrow, or rotate the focus and revisit the set?',
    ],
  },
} as const satisfies PonderCatalog;
