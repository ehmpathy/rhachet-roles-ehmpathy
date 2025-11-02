module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [1, 'always', 140],
    'type-enum': [2, 'always', ['arch', 'chore', 'feat', 'fix', 'revert']],
  },
};
