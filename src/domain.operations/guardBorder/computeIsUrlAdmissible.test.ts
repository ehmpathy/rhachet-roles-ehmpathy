import { given, then, when } from 'test-fns';

import { computeIsUrlAdmissible } from './computeIsUrlAdmissible';

describe('computeIsUrlAdmissible', () => {
  given('a localhost url', () => {
    when('hostname is "localhost"', () => {
      then('returns false', () => {
        expect(
          computeIsUrlAdmissible({ url: 'http://localhost:8080/admin' }),
        ).toBe(false);
      });
    });

    when('hostname is "127.0.0.1"', () => {
      then('returns false', () => {
        expect(
          computeIsUrlAdmissible({ url: 'http://127.0.0.1:3000/api' }),
        ).toBe(false);
      });
    });
  });

  given('a private IP url', () => {
    when('hostname is in 10.x.x.x range', () => {
      then('returns false', () => {
        expect(
          computeIsUrlAdmissible({ url: 'http://10.0.0.5/internal-api' }),
        ).toBe(false);
      });
    });

    when('hostname is in 172.16.x.x range', () => {
      then('returns false', () => {
        expect(computeIsUrlAdmissible({ url: 'http://172.16.0.1/admin' })).toBe(
          false,
        );
      });
    });

    when('hostname is in 172.31.x.x range', () => {
      then('returns false', () => {
        expect(
          computeIsUrlAdmissible({ url: 'http://172.31.255.255/config' }),
        ).toBe(false);
      });
    });

    when('hostname is in 192.168.x.x range', () => {
      then('returns false', () => {
        expect(
          computeIsUrlAdmissible({ url: 'http://192.168.1.1/admin' }),
        ).toBe(false);
      });
    });

    when('hostname is in 169.254.x.x range (link-local)', () => {
      then('returns false', () => {
        expect(
          computeIsUrlAdmissible({ url: 'http://169.254.0.1/metadata' }),
        ).toBe(false);
      });
    });
  });

  given('an IPv6 private url', () => {
    when('hostname starts with fc00:', () => {
      then('returns false', () => {
        expect(
          computeIsUrlAdmissible({ url: 'http://[fc00::1]/internal' }),
        ).toBe(false);
      });
    });

    when('hostname starts with fe80:', () => {
      then('returns false', () => {
        expect(
          computeIsUrlAdmissible({ url: 'http://[fe80::1]/link-local' }),
        ).toBe(false);
      });
    });
  });

  given('a public url', () => {
    when('hostname is github.com', () => {
      then('returns true', () => {
        expect(
          computeIsUrlAdmissible({ url: 'https://github.com/ehmpathy/repo' }),
        ).toBe(true);
      });
    });

    when('hostname is www.npmjs.com', () => {
      then('returns true', () => {
        expect(
          computeIsUrlAdmissible({
            url: 'https://www.npmjs.com/package/domain-objects',
          }),
        ).toBe(true);
      });
    });

    when('hostname is a public IP address', () => {
      then('returns true', () => {
        expect(computeIsUrlAdmissible({ url: 'http://8.8.8.8/dns' })).toBe(
          true,
        );
      });
    });

    when('hostname is 172.15.x.x (not in private range)', () => {
      then('returns true', () => {
        expect(
          computeIsUrlAdmissible({ url: 'http://172.15.0.1/public' }),
        ).toBe(true);
      });
    });

    when('hostname is 172.32.x.x (not in private range)', () => {
      then('returns true', () => {
        expect(
          computeIsUrlAdmissible({ url: 'http://172.32.0.1/public' }),
        ).toBe(true);
      });
    });
  });

  given('an invalid url', () => {
    when('url cannot be parsed', () => {
      then('returns false', () => {
        expect(computeIsUrlAdmissible({ url: 'not-a-valid-url' })).toBe(false);
      });
    });
  });
});
