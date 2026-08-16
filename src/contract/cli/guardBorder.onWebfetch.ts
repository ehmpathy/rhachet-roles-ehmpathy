import * as path from 'path';
import { genContextBrain } from 'rhachet';
import { keyrack } from 'rhachet/keyrack';
import { genBrainAtom } from 'rhachet-brains-fireworksai';

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
  // check env first (CI, direct env var), then keyrack (local dev)
  if (!process.env.FIREWORKS_API_KEY) {
    // use test env when NODE_ENV=test, otherwise prep
    const keyrackEnv = process.env.NODE_ENV === 'test' ? 'test' : 'prep';

    // fetch FIREWORKS_API_KEY from keyrack
    try {
      const keyGrant = await keyrack.get({
        for: { key: 'FIREWORKS_API_KEY' },
        owner: 'ehmpath',
        env: keyrackEnv,
      });

      // failfast if not granted
      if (keyGrant.attempt.status !== 'granted') {
        console.error(keyGrant.emit.stdout);
        process.exit(2);
      }

      // set env var for downstream
      process.env.FIREWORKS_API_KEY = keyGrant.attempt.grant.key.secret;
    } catch (error) {
      // keyrack SDK throws ConstraintError when keyrack.yml is absent
      // emit helpful unlock instructions and exit 2
      console.error(
        `\n🔐 FIREWORKS_API_KEY locked\n\nrun: rhx keyrack unlock --owner ehmpath --env ${keyrackEnv}\n`,
      );
      process.exit(2);
    }
  }

  // read stdin and parse input
  const stdin = await readStdin();
  const input = JSON.parse(stdin) as {
    tool_name: string;
    tool_input: { url?: string };
    tool_response: string;
    tool_use_id: string;
    session_id: string;
  };

  // build brain atom (fireworks/deepseek/v4-flash) bound with the api key
  // already granted above — a getter avoids a second keyrack round-trip.
  //
  // explicit mode (sync, atom supplied directly) on purpose: discovery mode
  // would scan `${process.cwd()}/package.json` for `rhachet-brains-*` deps,
  // which is fragile when this hook runs from a cwd whose package.json does
  // not declare rhachet-brains-fireworksai (e.g. a linked consumer repo) —
  // it silently finds zero atoms and throws BrainChoiceNotFoundError.
  const brain = genContextBrain({
    brains: {
      atoms: [genBrainAtom({ slug: 'fireworks/deepseek/v4-flash' })],
    },
    choice: { atom: 'fireworks/deepseek/v4-flash' },
    creds: async () => ({
      FIREWORKS_API_KEY: process.env.FIREWORKS_API_KEY!,
    }),
  }).brain.choice;
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
};
