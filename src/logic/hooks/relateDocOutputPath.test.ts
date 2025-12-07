import { given, then, when } from 'test-fns';

import { relateDocOutputPath } from './relateDocOutputPath';

describe('relateDocOutputPath', () => {
  given('path "a/b/topic.i8.[notes].v1.txt" and relation "../"', () => {
    const input = {
      path: 'a/b/topic.i8.[notes].v1.txt',
      relation: '../',
    };

    let result: string;

    when('executed', () => {
      result = relateDocOutputPath(input);
    });

    then('it pops one directory: "a/topic.i8.[notes].v1.txt"', () => {
      expect(result).toBe('a/topic.i8.[notes].v1.txt');
    });
  });

  given('path "a/b/topic.i8.[notes].v1.txt" and relation "../now"', () => {
    const input = {
      path: 'a/b/topic.i8.[notes].v1.txt',
      relation: '../now',
    };

    let result: string;

    when('executed', () => {
      result = relateDocOutputPath(input);
    });

    then(
      'it pops one directory and injects "now": "a/now/topic.i8.[notes].v1.txt"',
      () => {
        expect(result).toBe('a/now/topic.i8.[notes].v1.txt');
      },
    );
  });

  given('path "a/b/topic.i8.[notes].v1.txt" and relation "../../"', () => {
    const input = {
      path: 'a/b/topic.i8.[notes].v1.txt',
      relation: '../../',
    };

    let result: string;

    when('executed', () => {
      result = relateDocOutputPath(input);
    });

    then(
      'it pops two directories to repo root: "topic.i8.[notes].v1.txt"',
      () => {
        expect(result).toBe('topic.i8.[notes].v1.txt');
      },
    );
  });

  given('path "a/b/topic.i8.[notes].v1.txt" and relation "../../now"', () => {
    const input = {
      path: 'a/b/topic.i8.[notes].v1.txt',
      relation: '../../now',
    };

    let result: string;

    when('executed', () => {
      result = relateDocOutputPath(input);
    });

    then('it goes to root/now: "now/topic.i8.[notes].v1.txt"', () => {
      expect(result).toBe('now/topic.i8.[notes].v1.txt');
    });
  });

  given('path "a/b/topic.i8.[notes].v1.txt" and relation "./"', () => {
    const input = {
      path: 'a/b/topic.i8.[notes].v1.txt',
      relation: './',
    };

    let result: string;

    when('executed', () => {
      result = relateDocOutputPath(input);
    });

    then('it keeps the same directory: "a/b/topic.i8.[notes].v1.txt"', () => {
      expect(result).toBe('a/b/topic.i8.[notes].v1.txt');
    });
  });

  given('path "a/b/topic.i8.[notes].v1.txt" and relation "sub/dir"', () => {
    const input = {
      path: 'a/b/topic.i8.[notes].v1.txt',
      relation: 'sub/dir',
    };

    let result: string;

    when('executed', () => {
      result = relateDocOutputPath(input);
    });

    then(
      'it appends a subdir chain: "a/b/sub/dir/topic.i8.[notes].v1.txt"',
      () => {
        expect(result).toBe('a/b/sub/dir/topic.i8.[notes].v1.txt');
      },
    );
  });

  given(
    'path "topic.i8.[notes].v1.txt" (no directory) and relation "../"',
    () => {
      const input = {
        path: 'topic.i8.[notes].v1.txt',
        relation: '../',
      };

      let result: string;

      when('executed', () => {
        result = relateDocOutputPath(input);
      });

      then('it should show that its relative still', () => {
        expect(result).toBe('../topic.i8.[notes].v1.txt');
      });
    },
  );

  given('path "a/b/topic.i8.[notes].v1.txt" and relation "" (empty)', () => {
    const input = {
      path: 'a/b/topic.i8.[notes].v1.txt',
      relation: '',
    };

    let result: string;

    when('executed', () => {
      result = relateDocOutputPath(input);
    });

    then('it returns the original path unchanged', () => {
      expect(result).toBe('a/b/topic.i8.[notes].v1.txt');
    });
  });
});
