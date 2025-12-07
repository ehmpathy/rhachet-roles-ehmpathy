import type { ContextLogTrail } from 'as-procedure';
import { UnexpectedCodePathError } from 'helpful-errors';
import OpenAI from 'openai';
import type { ChatModel } from 'openai/resources/index';

export interface ContextOpenAI {
  openai: {
    auth: { key: string };
    llm: {
      model: ChatModel;
      output: 'words' | 'json';
    };
  };
}

const imagine = async (
  input: string,
  context: ContextOpenAI & ContextLogTrail,
): Promise<string> => {
  const openai = new OpenAI({
    apiKey: context.openai.auth.key,
  });
  const response = await openai.chat.completions.create({
    response_format:
      context.openai.llm.output === 'json'
        ? { type: 'json_object' }
        : undefined,
    messages: [
      {
        role: 'user',
        content: input,
      },
    ],
    model: context.openai.llm.model,
  });
  if (!response.choices[0])
    throw new UnexpectedCodePathError(
      'at least one response choice should be provided',
      { response },
    );
  if (response.choices.length > 1)
    throw new UnexpectedCodePathError(
      'more than one response.choice provided',
      { response },
    );
  if (!response.choices[0].message.content)
    throw new UnexpectedCodePathError('no content provided in response', {
      response,
    });
  const content = response.choices[0].message.content.trim();
  const stripped =
    content.startsWith('```') && content.endsWith('```') // strip ```{ext} automatically if its just the exterior surround
      ? content.split('\n').slice(1, -1).join('\n').trim()
      : content;
  return stripped;
};

export const sdkOpenAi = {
  imagine,
};
