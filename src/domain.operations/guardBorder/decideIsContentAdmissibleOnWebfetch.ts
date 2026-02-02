import type { BrainAtom } from 'rhachet';

import { decideIsContentAdmissible } from './decideIsContentAdmissible';

/**
 * .what = context for webfetch content admissibility decision
 * .why = encapsulates dependencies for the webfetch adapter
 */
export interface ContextDecideIsContentAdmissibleOnWebfetch {
  brain: BrainAtom;
  quarantineDir: string;
}

/**
 * .what = adapter that converts webfetch PostToolUse format to generic input
 * .why = decouples webfetch-specific stdin format from generic content check
 */
export const decideIsContentAdmissibleOnWebfetch = async (
  input: {
    toolName: string;
    toolInput: { url?: string };
    toolResponse: string;
    sessionId: string;
  },
  context: ContextDecideIsContentAdmissibleOnWebfetch,
): Promise<{ decision: 'allow' | 'block'; reason: string | null }> => {
  // adapt webfetch format to generic decideIsContentAdmissible
  return decideIsContentAdmissible(
    {
      url: input.toolInput.url ?? null,
      content: input.toolResponse,
      metadata: {
        toolName: input.toolName,
        sessionId: input.sessionId,
      },
    },
    context,
  );
};
