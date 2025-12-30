instead of to rerun tests over and over and get the `head` to check what happened while you preserve context

its BEST

to `| tee` into a `@gitroot/.log/test/(unit|integration|acceptance)/run.$ISOTIMESTAMP.out` file

then you can review that file over and over

also, other agents can review as well in parallel

last, it can also be used to compare progress in changes of tests

---

so, pretty much ALWAYS, you should ` | tee` into one of these files


===

best practice is to run test via `.skills/run.test.sh`, which does this for you
