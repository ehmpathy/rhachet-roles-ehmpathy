import * as path from 'path';

import type { EvalCase } from '../schemas';
import { getEvalCase } from './getEvalCase';
import { readAllYamlFilesFromDir } from './readAllYamlFilesFromDir';

/**
 * .what = load all eval cases for a rubric from filesystem
 * .why  = orchestrator that composes I/O and transformation
 */
export const getAllEvalCasesForRubric = (input: {
  /** rubric slug */
  rubric: string;
  /** base directory for eval cases */
  evalsDir: string;
}): EvalCase[] => {
  const rubricDir = path.join(input.evalsDir, 'cases', input.rubric);

  // read yaml files from directory (communicator handles I/O)
  const yamlFiles = readAllYamlFilesFromDir({
    dir: rubricDir,
    context: { rubric: input.rubric },
  });

  // transform each file content to eval case (orchestrator composes)
  return yamlFiles.map((file) =>
    getEvalCase({ content: file.content, sourcePath: file.filePath }),
  );
};
