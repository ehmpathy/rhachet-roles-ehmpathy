1. lookup the organization to use from declapract.use.yml
2. declare the AWS_PROFILE based on the pattern `AWS_PROFILE=$organization.dev`
   1. always use .dev, never .prod
   2. this specifies which remote resources we'll have access to for the session
   3. we always test against dev resources, to avoid prod pollution
3. run npm run start:testdb (or provision:integration-test-db, if start:testdb is not available yet)
   1. this setsup the local testdb against which the tests can be run

then, you can run the tests you need to

e.g.,

AWS_PROFILE=$organization.dev npm run test:integration -- syncPhoneFromWhodis.integration.test.ts
AWS_PROFILE=$organization.dev npm run test:unit -- syncPhoneFromWhodis.test.ts

etc

check package json for the other test variants you can run
