import * as fs from 'fs';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import * as path from 'path';

/**
 * .what = read all yaml file contents from a directory
 * .why  = communicator for raw filesystem I/O, no transformation
 */
export const readAllYamlFilesFromDir = (input: {
  /** directory to read yaml files from */
  dir: string;
  /** context for error messages */
  context: Record<string, unknown>;
}): Array<{ filePath: string; content: string }> => {
  // validate directory exists
  if (!fs.existsSync(input.dir)) {
    throw new BadRequestError('directory not found', {
      dir: input.dir,
      ...input.context,
    });
  }

  // read directory with context on error
  const files: string[] = (() => {
    try {
      return fs.readdirSync(input.dir);
    } catch (error) {
      throw new UnexpectedCodePathError('failed to read directory', {
        dir: input.dir,
        ...input.context,
        fsError: error instanceof Error ? error.message : String(error),
      });
    }
  })();

  // filter to yaml files
  const yamlFiles = files.filter((f) => f.endsWith('.yml'));

  // read each file with context on error
  return yamlFiles.map((file) => {
    const filePath = path.join(input.dir, file);

    const content: string = (() => {
      try {
        return fs.readFileSync(filePath, 'utf-8');
      } catch (error) {
        throw new UnexpectedCodePathError('failed to read file', {
          filePath,
          ...input.context,
          fsError: error instanceof Error ? error.message : String(error),
        });
      }
    })();

    return { filePath, content };
  });
};
