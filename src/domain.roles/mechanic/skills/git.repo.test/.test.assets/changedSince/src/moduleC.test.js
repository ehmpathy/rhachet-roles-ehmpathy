const m = require('./moduleC');
describe('C', () => {
  it('works', () => {
    expect(m.c).toBe(3);
  });
});
