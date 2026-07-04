module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [1, 'always', 140],
    // disabled: squash-merge aggregates bot co-author trailers into the body/footer,
    // and long bot noreply emails routinely exceed 100 chars — should not fail a release
    'body-max-line-length': [0, 'always', Infinity],
    'footer-max-line-length': [0, 'always', Infinity],
    'type-enum': [
      2,
      'always',
      [
        'break', // use break: instead of feat!: or BREAKING CHANGE footer
        'feat',
        'fix',
        // 'docs', // prefer fix(docs): instead of docs
        'chore',
        'revert',
        'cont', // continue progress within a p
      ],
    ],
    // forbid ! prefix (use break: instead)
    'subject-exclamation-mark': [2, 'never'],
  },
};
