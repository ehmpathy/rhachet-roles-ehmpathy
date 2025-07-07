import { flattie } from 'flattie';
import { BadRequestError } from 'helpful-errors';
import { Serializable } from 'serde-fns';

import { GitFile } from '../../../rhachet-artifact-git/src/domain/GitFile';
import { Artifact } from '../domain/Artifact';

/**
 * .what = generates a prompt via hydration of a template
 * .how =
 *   - reads the contents of the template
 *   - fills the variables of the template (hydrates)
 *   - returns the prompt content
 */
export const genPromptViaTemplate = async <
  TVariables extends Serializable,
>(input: {
  template: Artifact<typeof GitFile>;
  variables: TVariables;
}): Promise<string> => {
  // read the template file
  const { content } =
    (await input.template.get()) ??
    BadRequestError.throw('template artifact does not exist', { input });

  // flatten the variable keys using `flattie`
  const flattened = flattie(input.variables);

  // hydrate the variables using $.rhachet{key} syntax
  const hydrated = content.replace(
    /\$\.rhachet\{([a-zA-Z0-9._]+)\}/g,
    (_, key) =>
      flattened[key] ??
      BadRequestError.throw(
        `missing variable for $.rhachet{${key}} in template`,
        {
          template: input.template.ref,
          variable: `$.rhachet{${key}}`,
        },
      ),
  );

  return hydrated;
};
