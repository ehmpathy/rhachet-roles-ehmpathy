import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import { GStitcher } from 'rhachet';
import { given, when, then, getError } from 'test-fns';

import { RoleSkillContextGetter } from '../../domain/RoleSkillArgGetter';
import { getSkillContext } from './getSkillContext';

const getterExample = RoleSkillContextGetter.build<
  RoleSkillContextGetter<
    { key: string } & GStitcher['context'],
    { openaiApiKey: string }
  >
>({
  lookup: {
    openaiApiKey: {
      source: 'process.env',
      desc: 'your OpenAI key',
      envar: 'OPENAI_API_KEY',
      type: 'string',
    },
  },
  assess: (input: any): input is { openaiApiKey: string } =>
    typeof input?.openaiApiKey === 'string',
  instantiate: (input) =>
    ({
      key: input.openaiApiKey,
    } as any),
});

describe('getSkillContext', () => {
  given('a valid context getter requiring OPENAI_API_KEY', () => {
    const getter = getterExample.clone();

    when('called with passin: { openaiApiKey: "sk-abc" }', () => {
      const result = getSkillContext({
        getter,
        from: { passin: { openaiApiKey: 'sk-abc' } },
      });

      then('it should return the expected context', () => {
        expect(result).toEqual({ key: 'sk-abc' });
      });
    });

    when('called with passin: { wrongKey: "oops" }', () => {
      const error = getError(() =>
        getSkillContext({
          getter,
          from: { passin: { wrongKey: 'oops' } as any },
        }),
      );

      then('it should throw BadRequestError', () => {
        expect(error).toBeInstanceOf(BadRequestError);
      });
    });

    when('called with env: { OPENAI_API_KEY: "sk-env" }', () => {
      const result = getSkillContext({
        getter,
        from: { lookup: { env: { OPENAI_API_KEY: 'sk-env' } } },
      });

      then('it should return the expected context', () => {
        expect(result).toEqual({ key: 'sk-env' });
      });
    });

    when('called with env: {} (missing key)', () => {
      const error = getError(() =>
        getSkillContext({
          getter,
          from: { lookup: { env: {} } },
        }),
      );

      then('it should throw BadRequestError', () => {
        expect(error).toBeInstanceOf(BadRequestError);
      });
    });
  });

  given('a rejecting getter that fails all assess checks', () => {
    const getter = getterExample.clone({
      assess: (() => false) as any,
    });

    when('called with env: { OPENAI_API_KEY: "sk-reject" }', () => {
      const error = getError(() =>
        getSkillContext({
          getter,
          from: { lookup: { env: { OPENAI_API_KEY: 'sk-reject' } } },
        }),
      );

      then('it should throw UnexpectedCodePathError', () => {
        expect(error).toBeInstanceOf(UnexpectedCodePathError);
      });
    });

    when('called with passin: { openaiApiKey: "sk-reject" }', () => {
      const error = getError(() =>
        getSkillContext({
          getter,
          from: { passin: { openaiApiKey: 'sk-reject' } },
        }),
      );

      then('it should throw BadRequestError', () => {
        expect(error).toBeInstanceOf(BadRequestError);
      });
    });
  });
});
