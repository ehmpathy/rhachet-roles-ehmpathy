# howto: run integration tests in this repo

## .what

this repo's `test:integration` script is a placeholder (`echo 'todo: release'`).

to actually run integration tests, use `test:integration:non-cicd`:

```sh
npm run test:integration:non-cicd -- <test-file-pattern>
```

## .examples

```sh
# run all integration tests
npm run test:integration:non-cicd

# run specific test file
npm run test:integration:non-cicd -- symlink.integration.test.ts

# run tests matching pattern
npm run test:integration:non-cicd -- sedreplace
```

## .why

the cicd-ready `test:integration` script needs more setup before it can run in the pipeline. until then, `test:integration:non-cicd` is the way to run integration tests locally.

## .note

this will change once the integration test infrastructure is fully set up.
