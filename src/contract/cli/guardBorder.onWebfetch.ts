import * as path from 'path';
import { keyrack } from 'rhachet/keyrack';
import { genBrainAtom } from 'rhachet-brains-xai';

import { decideIsContentAdmissibleOnWebfetch } from '@src/domain.operations/guardBorder/decideIsContentAdmissibleOnWebfetch';

/**
 * .what = reads all stdin as a string
 * .why = PostToolUse hooks receive JSON via stdin
 */
const readStdin = async (): Promise<string> => {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
};

/**
 * .what = CLI entry point for border guard PostToolUse hook (webfetch variant)
 * .why = reads stdin JSON, adapts webfetch format, invokes decideIsContentAdmissible
 */
export const guardBorderOnWebfetch = async (): Promise<void> => {
  try {
    // fetch XAI_API_KEY from keyrack
    const keyGrant = await keyrack.get({
      for: { key: 'XAI_API_KEY' },
      owner: 'ehmpath',
      env: 'prep',
    });

    // failfast if not granted
    if (keyGrant.attempt.status !== 'granted') {
      console.error(keyGrant.emit.stdout);
      process.exit(2);
    }

    // set env var for downstream
    process.env.XAI_API_KEY = keyGrant.attempt.grant.key.secret;

    // read stdin and parse input
    let stdin: string;
    try {
      stdin = await readStdin();
    } catch (error) {
      console.error(
        `\n🚫 stdin read error: ${error instanceof Error ? error.message : String(error)}\n`,
      );
      process.exit(1); // malfunction: stdin read failure
    }

    let input: {
      tool_name: string;
      tool_input: { url?: string };
      tool_response: string;
      tool_use_id: string;
      session_id: string;
    };
    try {
      input = JSON.parse(stdin) as typeof input;
    } catch (error) {
      console.error(
        `\n🚫 invalid JSON input: ${error instanceof Error ? error.message : String(error)}\n`,
      );
      process.exit(2); // constraint: invalid input format
    }

    // setup context with brain atom (xai/grok/code-fast-1)
    const brain = genBrainAtom({ slug: 'xai/grok/code-fast-1' });
    const quarantineDir = path.join(process.cwd(), '.quarantine');

    // decide via webfetch adapter
    const result = await decideIsContentAdmissibleOnWebfetch(
      {
        toolName: input.tool_name,
        toolInput: input.tool_input,
        toolResponse: input.tool_response,
        sessionId: input.session_id,
      },
      { brain, quarantineDir },
    );

    // output and exit
    if (result.decision === 'block') {
      console.error(`\n🚫 content blocked at border: ${result.reason}\n`);
      process.exit(2);
    }

    process.exit(0);
  } catch (error) {
    // catch-all for unexpected errors
    console.error(
      `\n🚫 border guard error: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exit(1); // malfunction: unexpected error
  }
};
