import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { execTranslateDocOutputPath } from './execTranslateDocOutputPath';

const context = {
  log: console,
};

describe('execTranslateDocOutputPath (integration; hard-coded expectations)', () => {
  given('opts.output is not a string', () => {
    const input = { output: undefined } as any;

    when('executed', () => {
      const result = execTranslateDocOutputPath(input, context);

      then('it returns opts unchanged', () => {
        expect(result).toBe(input);
      });
    });
  });

  given('opts.output is a string but not an @translate(...) call', () => {
    const input = { output: 'hello.md', references: 'foo' } as any;

    when('executed', () => {
      const result = execTranslateDocOutputPath(input, context);

      then('it returns opts unchanged', () => {
        expect(result).toBe(input);
      });
    });
  });

  given('opts.output is @translate(...) but not references.0', () => {
    const input = {
      output: '@translate(references.1).as(story)',
      references: 'src/a.[stories].v1.i2.md',
    } as any;

    when('executed', () => {
      const err = getError(() => execTranslateDocOutputPath(input, context));

      then('it throws a BadRequestError', () => {
        expect(err).toBeInstanceOf(BadRequestError);
        expect((err as BadRequestError).message).toMatch(
          /unsupported @translation source/i,
        );
      });
    });
  });

  given(
    'opts.output is @translate(references.0) but missing .as(doctype)',
    () => {
      const input = {
        output: '@translate(references.0)',
        references: 'src/a.[stories].v1.i2.md',
      } as any;

      when('executed', () => {
        const err = getError(() => execTranslateDocOutputPath(input, context));

        then('it throws an UnexpectedCodePathError', () => {
          expect(err).toBeInstanceOf(UnexpectedCodePathError);
          expect((err as UnexpectedCodePathError).message).toMatch(
            /\.as\(doctype\) was not part of output/i,
          );
        });
      });
    },
  );

  given('opts.references is not a string', () => {
    const input = {
      output: '@translate(references.0).as(story)',
      references: ['not-a-string'] as any,
    } as any;

    when('executed', () => {
      const err = getError(() => execTranslateDocOutputPath(input, context));

      then('it throws a BadRequestError', () => {
        expect(err).toBeInstanceOf(BadRequestError);
        expect((err as BadRequestError).message).toMatch(
          /opts\.references is not a string/i,
        );
      });
    });
  });

  given('opts.references is an empty string', () => {
    const input = {
      output: '@translate(references.0).as(story)',
      references: '',
    } as any;

    when('executed', () => {
      const err = getError(() => execTranslateDocOutputPath(input, context));

      then('it throws a BadRequestError', () => {
        expect(err).toBeInstanceOf(BadRequestError);
        expect((err as BadRequestError).message).toMatch(
          /opts\.references is not a string/i,
        );
      });
    });
  });

  given(
    'happy path: both variant and instance after the source [doctype]',
    () => {
      // note: prefix should drop any trailing dot before composing
      const source =
        'src/product/cooltools/tool.hammer/step_5.stories/step_1.translate/' +
        'provider.plumber_pete.customer.scene_6.build.persp_pro.v2i3.[stories].v5.i7.md';

      const input = {
        output: '@translate(references.0).as(story)',
        references: `${source},other/ignored.md`,
      } as any;

      when('executed', () => {
        const result = execTranslateDocOutputPath(input, context);

        then(
          'it preserves vNiN before new [doctype], sets v1 after, and keeps extension',
          () => {
            const expectedPrefix =
              'src/product/cooltools/tool.hammer/step_5.stories/step_1.translate/' +
              'provider.plumber_pete.customer.scene_6.build.persp_pro.v2i3';
            const expected = `${expectedPrefix}.v5i7.[story].v1.md`;
            expect(result.output).toBe(expected);
          },
        );
      });
    },
  );

  given('only variant exists after the source [doctype]', () => {
    const source = 'x/y/z/topic.v9.[notes].v12.md';
    const input = {
      output: '@translate(references.0).as(report)',
      references: source,
    } as any;

    when('executed', () => {
      const result = execTranslateDocOutputPath(input, context);

      then('it places vN before [doctype], appends .v1.ext', () => {
        const expected = 'x/y/z/topic.v9.v12.[report].v1.md';
        expect(result.output).toBe(expected);
      });
    });
  });

  given('only instance exists after the source [doctype]', () => {
    const source = 'x/y/z/topic.[stories].i8.txt';
    const input = {
      output: '@translate(references.0).as(notes)',
      references: source,
    } as any;

    when('executed', () => {
      const result = execTranslateDocOutputPath(input, context);

      then('it places iN before [doctype], appends .v1.ext', () => {
        const expected = 'x/y/z/topic.i8.[notes].v1.txt';
        expect(result.output).toBe(expected);
      });
    });
  });

  given('no versions exist after the source [doctype]', () => {
    const source = 'dir/file.[story].md';
    const input = {
      output: '@translate(references.0).as(stories)',
      references: source,
    } as any;

    when('executed', () => {
      const result = execTranslateDocOutputPath(input, context);

      then(
        'it emits prefix.[doctype].v1.ext (no vNiN before [doctype])',
        () => {
          const expected = 'dir/file.[stories].v1.md';
          expect(result.output).toBe(expected);
        },
      );
    });
  });

  given('no extension present in the source path', () => {
    const source = 'a/b/c/topic.[stories].v3.i2';
    const input = {
      output: '@translate(references.0).as(summary)',
      references: source,
    } as any;

    when('executed', () => {
      const result = execTranslateDocOutputPath(input, context);

      then('it omits the trailing dot/extension', () => {
        const expected = 'a/b/c/topic.v3i2.[summary].v1';
        expect(result.output).toBe(expected);
      });
    });
  });

  given(
    'a [doctype] earlier in the path should be ignored (must be after last "/")',
    () => {
      const source = 'a/b.[draft]/c/topic.v1i2.i3.md'; // no [doctype] after last slash
      const input = {
        output: '@translate(references.0).as(story)',
        references: source,
      } as any;

      when('executed', () => {
        const err = getError(() => execTranslateDocOutputPath(input, context));

        then('it bubbles up the decoder error', () => {
          expect(err).toBeInstanceOf(BadRequestError);
          expect((err as BadRequestError).message).toMatch(
            /could not find any \[doctype]/i,
          );
        });
      });
    },
  );

  given('happy path with .ext(json): override source extension', () => {
    const source =
      'src/product/cooltools/tool.hammer/step_5.stories/step_1.translate/' +
      'provider.plumber_pete.customer.scene_6.build.persp_pro.v2i3.[stories].v5.i7.md';

    const input = {
      output: '@translate(references.0).as(story).ext(json)',
      references: `${source},ignored/also.md`,
    } as any;

    when('executed', () => {
      const result = execTranslateDocOutputPath(input, context);

      then('it sets the new extension to .json', () => {
        const expectedPrefix =
          'src/product/cooltools/tool.hammer/step_5.stories/step_1.translate/' +
          'provider.plumber_pete.customer.scene_6.build.persp_pro.v2i3';
        const expected = `${expectedPrefix}.v5i7.[story].v1.json`;
        expect(result.output).toBe(expected);
      });
    });
  });

  given(
    'source has no extension; .ext(md) supplies one after translation',
    () => {
      const source = 'a/b/c/topic.[stories].v3.i2';
      const input = {
        output: '@translate(references.0).as(summary).ext(md)',
        references: source,
      } as any;

      when('executed', () => {
        const result = execTranslateDocOutputPath(input, context);

        then('it appends .md', () => {
          const expected = 'a/b/c/topic.v3i2.[summary].v1.md';
          expect(result.output).toBe(expected);
        });
      });
    },
  );

  given(
    'source has an extension; .ext(md) replaces it with .md consistently',
    () => {
      const source = 'x/y/z/topic.[stories].i8.txt';
      const input = {
        output: '@translate(references.0).as(notes).ext(md)',
        references: source,
      } as any;

      when('executed', () => {
        const result = execTranslateDocOutputPath(input, context);

        then('it replaces .txt with .md', () => {
          const expected = 'x/y/z/topic.i8.[notes].v1.md';
          expect(result.output).toBe(expected);
        });
      });
    },
  );

  given(
    'only variant exists after [doctype]; .ext(json) still applies .json',
    () => {
      const source = 'x/y/z/topic.v9.[notes].v12.md';
      const input = {
        output: '@translate(references.0).as(report).ext(json)',
        references: source,
      } as any;

      when('executed', () => {
        const result = execTranslateDocOutputPath(input, context);

        then('it outputs ...[report].v1.json', () => {
          const expected = 'x/y/z/topic.v9.v12.[report].v1.json';
          expect(result.output).toBe(expected);
        });
      });
    },
  );
});

describe('execTranslateDocOutputPath .rel(...) (integration; hard-coded expectations)', () => {
  describe('relative to gitroot', () => {
    given(
      '@gitroot/ prefix re-roots from git repository root preserving only filename',
      () => {
        const source =
          'src/product/cooltools/tool.hammer/step_1.translate/' +
          'provider.scene_6.build.persp_pro.v2i3.[stories].v5.i7.md';

        const input = {
          output:
            '@translate(references.0).as(story).rel(@gitroot/output/formatted)',
          references: source,
        } as any;

        when('executed', () => {
          const result = execTranslateDocOutputPath(input, context);

          then('it re-roots from git root under output/formatted', () => {
            const expected =
              'output/formatted/provider.scene_6.build.persp_pro.v2i3.v5i7.[story].v1.md';
            expect(result.output).toBe(expected);
          });
        });
      },
    );

    given('@gitroot/ with nested target directories', () => {
      const source =
        'pkg/flows/step_3.translate/topic.branch.v9.[notes].v12.md';

      const input = {
        output:
          '@translate(references.0).as(report).rel(@gitroot/artifacts/reports)',
        references: source,
      } as any;

      when('executed', () => {
        const result = execTranslateDocOutputPath(input, context);

        then('it places under artifacts/reports/ from git root', () => {
          const expected =
            'artifacts/reports/topic.branch.v9.v12.[report].v1.md';
          expect(result.output).toBe(expected);
        });
      });
    });

    given('@gitroot/ with single directory', () => {
      const source = 'deep/nested/path/topic.[stories].i8.txt';

      const input = {
        output: '@translate(references.0).as(notes).rel(@gitroot/dist)',
        references: source,
      } as any;

      when('executed', () => {
        const result = execTranslateDocOutputPath(input, context);

        then('it places directly under dist/ from git root', () => {
          const expected = 'dist/topic.i8.[notes].v1.txt';
          expect(result.output).toBe(expected);
        });
      });
    });

    given('combine @gitroot/ .rel(...) with .ext(json)', () => {
      const source = 'any/path/item.[story].md';

      const input = {
        output:
          '@translate(references.0).as(summary).rel(@gitroot/build/json).ext(json)',
        references: source,
      } as any;

      when('executed', () => {
        const result = execTranslateDocOutputPath(input, context);

        then('it re-roots from git root and applies .json extension', () => {
          const expected = 'build/json/item.[summary].v1.json';
          expect(result.output).toBe(expected);
        });
      });
    });

    given('combine @gitroot/ .rel(...) with .v(n)', () => {
      const source = 'src/flow/step_1.translate/topic.branch.v9.[notes].v12.md';

      const input = {
        output:
          '@translate(references.0).as(report).v(3).rel(@gitroot/output/v3)',
        references: source,
      } as any;

      when('executed', () => {
        const result = execTranslateDocOutputPath(input, context);

        then('it re-roots from git root and uses specified variant', () => {
          const expected = 'output/v3/topic.branch.v9.v12.[report].v3.md';
          expect(result.output).toBe(expected);
        });
      });
    });

    given('source without extension + @gitroot/ .rel(...)', () => {
      const source = 'docs/step.translate/topic.v3i2.[stories]';

      const input = {
        output: '@translate(references.0).as(summary).rel(@gitroot/final)',
        references: source,
      } as any;

      when('executed', () => {
        const result = execTranslateDocOutputPath(input, context);

        then('it re-roots and emits no trailing extension', () => {
          const expected = 'final/topic.v3i2.[summary].v1';
          expect(result.output).toBe(expected);
        });
      });
    });

    given('@gitroot alone (just @gitroot/)', () => {
      const source = 'very/deep/nested/path/file.[draft].v2.md';

      const input = {
        output: '@translate(references.0).as(final).rel(@gitroot/)',
        references: source,
      } as any;

      when('executed', () => {
        const result = execTranslateDocOutputPath(input, context);

        then('it places file directly at git root', () => {
          const expected = 'file.v2.[final].v1.md';
          expect(result.output).toBe(expected);
        });
      });
    });

    given(
      'complex real-world example with deep path and trailing slash',
      () => {
        const source =
          'src/products/protools/tool.routecal/1.requirements/step_2.draft/' +
          'provider.plumber_pete.customer.scene_6.v2i3.[stories].v5.i7.md';

        const input = {
          output:
            '@translate(references.0).as(review).ext(json).rel(@gitroot/src/products/protools/tool.routecal/2.architecture/step_1.criteria/.rheview/).v(5)',
          references: source,
        } as any;

        when('executed', () => {
          const result = execTranslateDocOutputPath(input, context);

          then(
            'it re-roots to the specified gitroot path with all modifiers applied',
            () => {
              const expected =
                'src/products/protools/tool.routecal/2.architecture/step_1.criteria/.rheview/' +
                'provider.plumber_pete.customer.scene_6.v2i3.v5i7.[review].v5.json';
              expect(result.output).toBe(expected);
            },
          );
        });
      },
    );
  });
  describe('relative to input file', () => {
    given('move from step_1.translate → ../step_2.format (sibling up)', () => {
      const source =
        'src/product/cooltools/tool.hammer/step_1.translate/' +
        'provider.scene_6.build.persp_pro.v2i3.[stories].v5.i7.md';

      const input = {
        output: '@translate(references.0).as(story).rel(../step_2.format)',
        references: source,
      } as any;

      when('executed', () => {
        const result = execTranslateDocOutputPath(input, context);

        then(
          'it re-roots under step_2.format and composes new file path',
          () => {
            const expectedPrefix =
              'src/product/cooltools/tool.hammer/step_2.format/' +
              'provider.scene_6.build.persp_pro.v2i3';
            const expected = `${expectedPrefix}.v5i7.[story].v1.md`;
            expect(result.output).toBe(expected);
          },
        );
      });
    });

    given('append a child dir via .rel(./drafts)', () => {
      const source =
        'pkg/flows/step_3.translate/topic.branch.v9.[notes].v12.md';

      const input = {
        output: '@translate(references.0).as(report).rel(./drafts)',
        references: source,
      } as any;

      when('executed', () => {
        const result = execTranslateDocOutputPath(input, context);

        then('it nests under drafts/', () => {
          const expected =
            'pkg/flows/step_3.translate/drafts/topic.branch.v9.v12.[report].v1.md';
          expect(result.output).toBe(expected);
        });
      });
    });

    given('pop one directory via .rel(..)', () => {
      const source = 'a/b/topic.[stories].i8.txt';

      const input = {
        output: '@translate(references.0).as(notes).rel(..)',
        references: source,
      } as any;

      when('executed', () => {
        const result = execTranslateDocOutputPath(input, context);

        then('it moves to a/ and composes there', () => {
          const expected = 'a/topic.i8.[notes].v1.txt';
          expect(result.output).toBe(expected);
        });
      });
    });

    given('combine .rel(...) with .ext(json)', () => {
      const source = 'root/x/item.[story].md';

      const input = {
        output: '@translate(references.0).as(summary).rel(../y).ext(json)',
        references: source,
      } as any;

      when('executed', () => {
        const result = execTranslateDocOutputPath(input, context);

        then('it re-roots and overrides extension to .json', () => {
          const expected = 'root/y/item.[summary].v1.json';
          expect(result.output).toBe(expected);
        });
      });
    });

    given(
      'source without extension + .rel(...) keeps no trailing dot unless .ext provided',
      () => {
        const source = 'docs/step.translate/topic.v3i2.[stories]';

        const input = {
          output: '@translate(references.0).as(summary).rel(../step.out)',
          references: source,
        } as any;

        when('executed', () => {
          const result = execTranslateDocOutputPath(input, context);

          then('it emits no trailing extension', () => {
            const expected = 'docs/step.out/topic.v3i2.[summary].v1';
            expect(result.output).toBe(expected);
          });
        });
      },
    );
  });
});

describe('execTranslateDocOutputPath .v(n) (integration; hard-coded expectations)', () => {
  given('happy path: override starting variant to v2', () => {
    const source =
      'src/product/cooltools/tool.hammer/step_5.stories/step_1.translate/' +
      'provider.plumber_pete.customer.scene_6.build.persp_pro.v2i3.[stories].v5.i7.md';

    const input = {
      output: '@translate(references.0).as(story).v(2)',
      references: `${source},other/ignored.md`,
    } as any;

    when('executed', () => {
      const result = execTranslateDocOutputPath(input, context);

      then('it preserves vNiN before [doctype] and sets tail to .v2', () => {
        const expectedPrefix =
          'src/product/cooltools/tool.hammer/step_5.stories/step_1.translate/' +
          'provider.plumber_pete.customer.scene_6.build.persp_pro.v2i3';
        const expected = `${expectedPrefix}.v5i7.[story].v2.md`;
        expect(result.output).toBe(expected);
      });
    });
  });

  given('only instance exists after source [doctype]; override to v3', () => {
    const source = 'x/y/z/topic.[stories].i8.txt';
    const input = {
      output: '@translate(references.0).as(notes).v(3)',
      references: source,
    } as any;

    when('executed', () => {
      const result = execTranslateDocOutputPath(input, context);

      then('it places iN before [doctype] and appends .v3.ext', () => {
        const expected = 'x/y/z/topic.i8.[notes].v3.txt';
        expect(result.output).toBe(expected);
      });
    });
  });

  given('no versions exist after source [doctype]; override to v4', () => {
    const source = 'dir/file.[story].md';
    const input = {
      output: '@translate(references.0).as(stories).v(4)',
      references: source,
    } as any;

    when('executed', () => {
      const result = execTranslateDocOutputPath(input, context);

      then('it emits prefix.[doctype].v4.ext', () => {
        const expected = 'dir/file.[stories].v4.md';
        expect(result.output).toBe(expected);
      });
    });
  });

  given('.v(n) with .ext override and preserved vNiN', () => {
    const source =
      'src/product/cooltools/tool.hammer/step_5.stories/step_1.translate/' +
      'provider.scene_6.build.persp_pro.v2i3.[stories].v5.i7.md';

    const input = {
      output: '@translate(references.0).as(story).v(6).ext(json)',
      references: source,
    } as any;

    when('executed', () => {
      const result = execTranslateDocOutputPath(input, context);

      then('it outputs ...[story].v6.json (and preserves v5i7 before)', () => {
        const expectedPrefix =
          'src/product/cooltools/tool.hammer/step_5.stories/step_1.translate/' +
          'provider.scene_6.build.persp_pro.v2i3';
        const expected = `${expectedPrefix}.v5i7.[story].v6.json`;
        expect(result.output).toBe(expected);
      });
    });
  });

  given('.v(n) combined with .rel(...)', () => {
    const source = 'src/flow/step_1.translate/topic.branch.v9.[notes].v12.md';

    const input = {
      output: '@translate(references.0).as(report).v(2).rel(../step_2.format)',
      references: source,
    } as any;

    when('executed', () => {
      const result = execTranslateDocOutputPath(input, context);

      then('it re-roots and uses v2 at the tail', () => {
        const expected =
          'src/flow/step_2.format/topic.branch.v9.v12.[report].v2.md';
        expect(result.output).toBe(expected);
      });
    });
  });

  given('invalid .v(0) should fail fast', () => {
    const source = 'x/y/z/topic.[stories].i8.txt';
    const input = {
      output: '@translate(references.0).as(notes).v(0)',
      references: source,
    } as any;

    when('executed', () => {
      const err = getError(() => execTranslateDocOutputPath(input, context));

      then('it throws a BadRequestError about positive integer', () => {
        expect(err).toBeInstanceOf(BadRequestError);
        expect((err as BadRequestError).message).toMatch(
          /\.v\(n\) must be a positive integer/i,
        );
      });
    });
  });

  given('absence of .v(n) defaults to .v1 (control)', () => {
    const source = 'x/y/z/topic.[stories].i8.txt';
    const input = {
      output: '@translate(references.0).as(notes)',
      references: source,
    } as any;

    when('executed', () => {
      const result = execTranslateDocOutputPath(input, context);

      then('it uses v1 at the tail', () => {
        const expected = 'x/y/z/topic.i8.[notes].v1.txt';
        expect(result.output).toBe(expected);
      });
    });
  });
});
