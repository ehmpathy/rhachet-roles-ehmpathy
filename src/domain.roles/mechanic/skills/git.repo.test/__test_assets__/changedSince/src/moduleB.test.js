const m = require('./moduleB');
describe('B', () => {
  it('works', () => {
    expect(m.b).toBe(2);
  });
});
