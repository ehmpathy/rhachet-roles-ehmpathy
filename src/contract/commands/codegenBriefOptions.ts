import { asCommand } from '@ehmpathy/as-command';
import glob from 'fast-glob';
import fs from 'fs';
import path from 'path';
import { getGitRepoRoot } from 'rhachet-artifact-git';

const command = asCommand(
  {
    name: path.basename(__filename),
    stage: 'prep',
    dir: __dirname + '/.temp',
    log: console,
  },
  async (input: { role: 'Mechanic' | 'Architect' | 'Ecologist' }) => {
    // lookup the briefs available in the expected dir
    const briefsDir = path.join(
      (await getGitRepoRoot({ from: __dirname })) +
        `/src/roles/${input.role.toLowerCase()}/briefs`,
    );
    const patterns = [
      path.join(briefsDir, '**/*'), // include all
      '!' + path.join(briefsDir, '**/*.stub.*'), // exclude .stub.* files, since those were the stubs that the full briefs were expanded from
    ];
    const filePaths = await glob(patterns, { onlyFiles: true });

    // declare each path as a key
    const keys = filePaths
      .filter((file) => !path.basename(file).startsWith('.'))
      .map(
        (file) => path.relative(briefsDir, file).replace(/\\/g, '/'), // preserve file extension
      );
    const asConstLines = keys.map((k) => `  '${k}',`).join('\n');

    const fileContents = `
/**
 * .what = the options for the briefs available to role ${input.role}
 * .note = codegened via:
 * \`\`\`sh
 *  npx tsx src/contract/commands/${path.basename(__filename)}
 * \`\`\`
 */
const options = [
${asConstLines}
] as const;

export type BriefOption${input.role} = typeof options[number];
`;

    // persist the output
    const outputFile = path.join(
      briefsDir,
      `../get${input.role}Brief.Options.codegen.ts`,
    );
    fs.writeFileSync(outputFile, fileContents.trimStart());
    console.info(`✅ wrote ${outputFile}`);
    return { outputFile, fileContents };
  },
);

// npx tsx src/contract/commands/codegenBriefOptions.ts
if (require.main === module) {
  void command({ role: 'Ecologist' });
  void command({ role: 'Architect' });
  void command({ role: 'Mechanic' });
}
