# self-review r1: has-behavior-coverage

## question

does the verification checklist show every behavior from wish/vision has a test?

## behaviors from wish (0.wish.md)

| behavior | checklist entry | test location | status |
|----------|-----------------|---------------|--------|
| brief exists and is booted | brief teaches verification pattern | boot.yml registration | [OK] |
| hook warns on compaction resume | hook reminds after compaction | postcompact.trust-but-verify.integration.test.ts | [OK] |
| hook lists claim types | hook emits reminder content | test case 1: emits reminder to stdout | [OK] |
| hook allows continuation | hook exits 0 | test case 1: exits 0 to allow continuation | [OK] |

## done-when criteria from wish

| criterion | covered? | how? |
|-----------|----------|------|
| brief exists and is booted with mechanic role | yes | boot.yml registration, boot output verification |
| (optional) sessionstart hook warns on compaction resume | yes | postcompact hook tests (5 tests) |

## behaviors from vision (1.vision.md)

| behavior | checklist entry | status |
|----------|-----------------|--------|
| mechanic sees reminder after compaction | hook reminds after compaction | [OK] |
| reminder lists claim types | hook emits reminder content | [OK] |
| reminder points to brief | hook emits reminder content (see: rule.require.trust-but-verify) | [OK] |

## absent behaviors

none found — all behaviors from wish and vision are represented in the verification checklist.

## why it holds

the verification checklist maps directly to the wish's "done when" criteria:
1. brief registration is verified via boot.yml entry
2. hook behavior is verified via 5 integration tests that check output content, exit code, and execution across trigger types (auto/manual)

