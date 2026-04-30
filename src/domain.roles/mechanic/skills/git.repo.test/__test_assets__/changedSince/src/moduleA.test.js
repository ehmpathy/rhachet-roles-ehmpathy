const m = require('./moduleA');
describe('A', () => {
  it('works', () => {
    expect(m.a).toBe(1);
  });
});
