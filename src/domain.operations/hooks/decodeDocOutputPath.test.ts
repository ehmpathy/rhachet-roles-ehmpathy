import { BadRequestError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { decodeDocOutputPath } from './decodeDocOutputPath';

describe('decodeDocOutputPath (only considers [doctype]s after the last "/")', () => {
  given('a typical path with [doctype] after the last slash', () => {
    const input =
      'src/product/protools/tool.routecal/step_5.stories/step_1.translate/' +
      'provider.plumber_pete.customer_needs.scene_6.loyalty_build.persp_pro.v1i2.[stories].v1.i3.md';

    when('decoding the path', () => {
      const result = decodeDocOutputPath(input);

      then('it returns the expected fields', () => {
        expect(result).toEqual({
          doctype: 'stories',
          prefix:
            'src/product/protools/tool.routecal/step_5.stories/step_1.translate/' +
            'provider.plumber_pete.customer_needs.scene_6.loyalty_build.persp_pro.v1i2',
          versions: { variant: 1, instance: 3 },
          extension: 'md',
        });
      });
    });
  });

  given(
    'multiple [doctype] segments exists, but only those after the last slash count',
    () => {
      // two doctypes before the last slash, one after it
      const input =
        'root/alpha.[draft].beta/gamma.[notes].delta/' + // ignored doctypes (before last slash)
        'omega.v2.[stories].i7.md'; // the only considered doctype

      when('decoding the path', () => {
        const result = decodeDocOutputPath(input);

        then('it uses the [doctype] after the last slash', () => {
          expect(result.doctype).toBe('stories');
          expect(result.prefix).toBe(
            'root/alpha.[draft].beta/gamma.[notes].delta/omega.v2',
          );
          expect(result.versions).toEqual({ variant: null, instance: 7 });
          expect(result.extension).toBe('md');
        });
      });
    },
  );

  given('no [doctype] appears after the last slash', () => {
    const input = 'a/b/c/topic.[stories]/omega.v2.i7.md'; // [stories] is before the last slash

    when('decoding the path', () => {
      const err = getError(() => decodeDocOutputPath(input));

      then('it throws a BadRequestError', () => {
        expect(err).toBeInstanceOf(BadRequestError);
        expect((err as BadRequestError).message).toMatch(
          /could not find any \[doctype]/i,
        );
      });
    });
  });

  given(
    'multiple [doctype]s appear after the last slash (take the last one)',
    () => {
      const input = 'a/b/c/topic.[draft].x.[stories].v1.md'; // both doctypes after last slash

      when('decoding the path', () => {
        const result = decodeDocOutputPath(input);

        then('it picks the last [doctype] after the last slash', () => {
          expect(result).toEqual({
            doctype: 'stories',
            prefix: 'a/b/c/topic.[draft].x',
            versions: { variant: 1, instance: null },
            extension: 'md',
          });
        });
      });
    },
  );

  given('a path with only variant after the doctype (post-last-slash)', () => {
    const input = 'x/y/z/foo.[story].v12.md';

    when('decoding the path', () => {
      const result = decodeDocOutputPath(input);

      then('it parses variant and leaves instance null', () => {
        expect(result).toEqual({
          doctype: 'story',
          prefix: 'x/y/z/foo',
          versions: { variant: 12, instance: null },
          extension: 'md',
        });
      });
    });
  });

  given('a path with only instance after the doctype (post-last-slash)', () => {
    const input = 'x/y/z/foo.[story].i9.md';

    when('decoding the path', () => {
      const result = decodeDocOutputPath(input);

      then('it parses instance and leaves variant null', () => {
        expect(result).toEqual({
          doctype: 'story',
          prefix: 'x/y/z/foo',
          versions: { variant: null, instance: 9 },
          extension: 'md',
        });
      });
    });
  });

  given(
    'a path with explicit no-attempt marker "._" and an extension (post-last-slash)',
    () => {
      const input = 'a/b/c/topic.[stories]._.md';

      when('decoding the path', () => {
        const result = decodeDocOutputPath(input);

        then(
          'it ignores "_" for versions and still captures the extension',
          () => {
            expect(result).toEqual({
              doctype: 'stories',
              prefix: 'a/b/c/topic',
              versions: { variant: null, instance: null },
              extension: 'md',
            });
          },
        );
      });
    },
  );

  given(
    'a path with no extension after the doctype and versions (post-last-slash)',
    () => {
      const input = 'a/b/c/topic.[stories].v3.i2';

      when('decoding the path', () => {
        const result = decodeDocOutputPath(input);

        then('it sets extension to null', () => {
          expect(result).toEqual({
            doctype: 'stories',
            prefix: 'a/b/c/topic',
            versions: { variant: 3, instance: 2 },
            extension: null,
          });
        });
      });
    },
  );

  given(
    'a path with only an extension immediately after the doctype (post-last-slash)',
    () => {
      const input = 'a/b/c/topic.[stories].md';

      when('decoding the path', () => {
        const result = decodeDocOutputPath(input);

        then('it returns no versions and the extension', () => {
          expect(result).toEqual({
            doctype: 'stories',
            prefix: 'a/b/c/topic',
            versions: { variant: null, instance: null },
            extension: 'md',
          });
        });
      });
    },
  );

  given('case-insensitive markers still parse (post-last-slash)', () => {
    const input = 'a/b/c/topic.[STORIES].V10.I4.MD';

    when('decoding the path', () => {
      const result = decodeDocOutputPath(input);

      then('it parses regardless of case', () => {
        expect(result).toEqual({
          doctype: 'STORIES',
          prefix: 'a/b/c/topic',
          versions: { variant: 10, instance: 4 },
          extension: 'MD',
        });
      });
    });
  });
});
