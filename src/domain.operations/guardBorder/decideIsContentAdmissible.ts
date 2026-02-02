import type { BrainAtom } from 'rhachet';

import { computeIsUrlAdmissible } from './computeIsUrlAdmissible';
import { imagineIsContentAdmissible } from './imagineIsContentAdmissible';
import { setContentToQuarantine } from './setContentToQuarantine';

/**
 * .what = context for border guard decision
 * .why = encapsulates dependencies for url check, content check, and quarantine
 */
export interface ContextDecideIsContentAdmissible {
  brain: BrainAtom;
  quarantineDir: string;
}

/**
 * .what = orchestrates border guard decision for fetched content
 * .why = single entry point that composes url check, content check, and quarantine
 */
export const decideIsContentAdmissible = async (
  input: {
    url: string | null;
    content: string;
    metadata: {
      toolName: string;
      sessionId: string;
    };
  },
  context: ContextDecideIsContentAdmissible,
): Promise<{ decision: 'allow' | 'block'; reason: string | null }> => {
  // url pre-check (if url provided)
  if (input.url && !computeIsUrlAdmissible({ url: input.url })) {
    await setContentToQuarantine(
      {
        content: input.content,
        reason: 'url not admissible',
        url: input.url,
        toolName: input.metadata.toolName,
        sessionId: input.metadata.sessionId,
      },
      { quarantineDir: context.quarantineDir },
    );
    return { decision: 'block', reason: 'url not admissible' };
  }

  // content admissibility check via brain.ask
  const admissibility = await imagineIsContentAdmissible(
    { content: input.content },
    { brain: context.brain },
  );

  // write to quarantine if blocked
  if (admissibility.decision === 'block') {
    await setContentToQuarantine(
      {
        content: input.content,
        reason: admissibility.reason ?? 'content not admissible',
        url: input.url,
        toolName: input.metadata.toolName,
        sessionId: input.metadata.sessionId,
      },
      { quarantineDir: context.quarantineDir },
    );
  }

  return admissibility;
};
