import * as path from 'path';
import {
  type BrainAtom,
  BrainChoiceNotFoundError,
  genContextBrain,
} from 'rhachet';

import { decideIsContentAdmissibleOnWebfetch } from '@src/domain.operations/guardBorder/decideIsContentAdmissibleOnWebfetch';
import { getAllGuardBorderBrainAtoms } from '@src/domain.operations/guardBorder/getAllGuardBorderBrainAtoms';
import { getOneGuardBorderBrainChoice } from '@src/domain.operations/guardBorder/getOneGuardBorderBrainChoice';
import {
  getOneGuardBorderBrainCreds,
  getOneGuardBorderBrainKeyName,
} from '@src/domain.operations/guardBorder/getOneGuardBorderBrainCreds';

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
 * .what = writes an error render to BOTH stdout and stderr
 * .why = rule.require.skill-output-streams: a failure must reach stdout so it is
 *        visible in the terminal, AND stderr so log aggregation catches it. a
 *        render sent to one stream alone is lost to whoever watches the other.
 *        this is the ts twin of the shell `emit_both` the hooks in this repo use.
 */
const emitBoth = (render: string): void => {
  console.log(render);
  console.error(render);
};

/**
 * .what = CLI entry point for border guard PostToolUse hook (webfetch variant)
 * .why = reads stdin JSON, adapts webfetch format, invokes decideIsContentAdmissible
 */
const _guardBorderOnWebfetch = async (): Promise<void> => {
  // read stdin and parse input
  const stdin = await readStdin();
  const input = JSON.parse(stdin) as {
    tool_name: string;
    tool_input: { url?: string };
    tool_response: string;
    tool_use_id: string;
    session_id: string;
  };

  // look up the brain, with creds supplied by keyrack
  // .why = genContextBrain is the shape every other brain caller in this repo
  //        uses (getEvalVerdict, extractKernels, compress.via.bhrain), so
  //        rhachet fetches the key itself and this cli holds no per-key setup.
  // .why = brains are supplied explicitly rather than discovered: this hook runs
  //        from whatever cwd the caller is in, where discovery reports
  //        `available brains (none)` and the guard would fail on every fetch.
  const choice = getOneGuardBorderBrainChoice();
  const brain = ((): BrainAtom<any> => {
    try {
      return genContextBrain({
        brains: { atoms: getAllGuardBorderBrainAtoms() },
        choice: { atom: choice.slug },
        creds: async () =>
          getOneGuardBorderBrainCreds({
            slug: choice.slug,
            keyrackEnv: choice.keyrackEnv,
          }),
      }).brain.choice;
    } catch (error) {
      // an unknown brain is caller-fixable; name the fix, never a stack trace
      if (error instanceof BrainChoiceNotFoundError) {
        emitBoth(
          `\n🧠 unknown brain "${choice.slug}"\n\n` +
            `set GUARD_BORDER_BRAIN to one of:\n` +
            getAllGuardBorderBrainAtoms()
              .map((atom) => `  - ${atom.slug}`)
              .join('\n') +
            `\n`,
        );
        process.exit(2);
      }
      throw error;
    }
  })();
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
  ).catch((error: unknown) => {
    // a locked api key is caller-fixable: name the fix and exit, no stack trace.
    // every other error rethrows, so a real malfunction stays loud.
    //
    // .why = the message is rebuilt here rather than forwarded from the error.
    //        rhachet's creds-getter wraps our clean "KEY locked — run: rhx
    //        keyrack unlock" in a BadRequestError that appends generic sdk-
    //        integrator guidance ("check your credential source (vault, kms,
    //        db)") plus a json fix blob. forwarded verbatim, a human reads two
    //        contradictory remedies and a raw dump. the key name and env are
    //        both in scope, so the one true fix is stated on its own.
    if (error instanceof Error && error.message.includes('keyrack unlock')) {
      const keyName = getOneGuardBorderBrainKeyName({ slug: choice.slug });
      emitBoth(
        `\n🔐 ${keyName} locked — run: rhx keyrack unlock --owner ehmpath --env ${choice.keyrackEnv} --key ${keyName}\n`,
      );
      process.exit(2);
    }
    throw error;
  });

  // output and exit
  if (result.decision === 'block') {
    emitBoth(`\n🚫 content blocked at border: ${result.reason}\n`);
    process.exit(2);
  }

  process.exit(0);
};

/**
 * .what = the exported entry point: the guard, with a malfunction frame
 * .why = every caller-fixable failure of this contract already renders on both
 *        streams. a MALFUNCTION did not: the shell entry is a bare
 *        `.then(m => m.guardBorderOnWebfetch())`, so an unexpected throw became
 *        an unhandled rejection and node wrote its stack to stderr alone. a
 *        human who reads stdout saw silence from the one failure that is not
 *        theirs to fix (rule.require.skill-output-streams).
 * .why = the frame sits at the boundary rather than beside each rethrow, so it
 *        covers every malfunction path — a broken brain call, unparseable
 *        stdin, an sdk crash — with one code path instead of a frame per throw
 *        site that a later path would silently skip.
 * .why = the frame states which guard broke and points at the stack; it never
 *        restates the cause. the rethrow is preserved so the real stack still
 *        surfaces in full (rule.forbid.failhide) — a second account of the same
 *        error would only drift from the first.
 */
export const guardBorderOnWebfetch = async (): Promise<void> => {
  try {
    await _guardBorderOnWebfetch();
  } catch (error) {
    emitBoth(
      `\n💥 guardBorder.onWebfetch malfunctioned — the cause follows on stderr\n`,
    );
    throw error;
  }
};
