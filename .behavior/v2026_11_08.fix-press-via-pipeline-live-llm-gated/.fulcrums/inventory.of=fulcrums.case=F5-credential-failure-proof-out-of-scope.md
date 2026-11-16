# F5: no lack-of-credential test in this diff

- fork: add a live case that runs with the brain key absent and asserts a loud error · leave the credential path to its owner
- taken: leave it. this diff changes how pressViaPipeline gets its compressor and when the live suite runs. it does not touch the credential path. that path is `compressViaBhrain` → rhachet `genContextBrain({ creds: { keyrack: { owner: 'ehmpath', env } } })` (`compress.via.bhrain.ts:364-373`), and its failure contract belongs to rhachet. a test that proves it here would have to lock or empty the shared `ehmpath` keyrack. that is unsafe on a crew box, since other clones share the same unlock
- no by-hand proof is reachable either. the keyrack owner and env are hardcoded (`:369-370`), and both `test` and `prep` hold an unlocked key on this box (`rhx keyrack status --owner ehmpath`). a lack-of-credential case needs the compressor to take its creds from `context`, which is a contract change to a six-caller operation. caught as `dreams/2026_11_08.fix-compressor-credential-failure-case.dream.md`
- rework: clean. the credential case lands in the compressor's own contract suite, with no change to this diff
- confidence: 88%
- where: `src/domain.roles/librarian/skills/brief.compress/compress.via.bhrain.ts:364-373`
- verdict: open
