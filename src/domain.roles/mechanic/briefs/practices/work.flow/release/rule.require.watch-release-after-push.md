# rule.require.watch-release-after-push

## .what

after every push, immediately watch the release cycle and surface any CI failures.

## .why

- push without verification leaves work incomplete
- CI failures need prompt attention
- errors surfaced immediately are fixed faster
- prevents "fire and forget" pushes

## .how

after `git.commit.set --push` or `git.commit.push`, run:

```sh
rhx git.release --watch || rhx show.gh.test.errors
```

this will:
1. watch CI checks until they complete
2. if any fail, show the test errors automatically

## .pattern

```sh
# commit and push
printf '...' | rhx git.commit.set -m @stdin --mode apply --push

# immediately watch release
rhx git.release --watch || rhx show.gh.test.errors

# if passed, enable automerge
rhx git.release --mode apply
```

## .enforcement

- push without subsequent release watch = blocker
- mechanic must take initiative; do not wait for human to ask
