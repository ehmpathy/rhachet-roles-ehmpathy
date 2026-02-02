import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * .what = writes blocked content to .quarantine/ for human inspection
 * .why = preserves audit trail and enables false positive review
 */
export const setContentToQuarantine = async (
  input: {
    content: string;
    reason: string;
    url: string | null;
    sessionId: string;
    toolName: string;
  },
  context: {
    quarantineDir: string;
  },
): Promise<{ path: string }> => {
  // generate filename with timestamp and session id prefix
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sessionPrefix = input.sessionId.slice(0, 8);
  const filename = `${timestamp}.${sessionPrefix}.json`;
  const filepath = path.join(context.quarantineDir, filename);

  // ensure quarantine directory exists
  await fs.mkdir(context.quarantineDir, { recursive: true });

  // write quarantine file with metadata
  await fs.writeFile(
    filepath,
    JSON.stringify(
      {
        quarantinedAt: new Date().toISOString(),
        reason: input.reason,
        url: input.url,
        toolName: input.toolName,
        sessionId: input.sessionId,
        content: input.content,
      },
      null,
      2,
    ),
  );

  return { path: filepath };
};
