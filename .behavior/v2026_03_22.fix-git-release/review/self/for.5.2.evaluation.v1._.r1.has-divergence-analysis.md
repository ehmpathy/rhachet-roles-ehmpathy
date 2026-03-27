# review: has-divergence-analysis (r1)

## methodology

compared blueprint declarations against evaluation document section by section. verified all divergences are documented with resolution and rationale.

---

## summary comparison

| aspect | blueprint declared | evaluation documented | divergence |
|--------|-------------------|----------------------|------------|
| decomposed operations | 6 files | 6 files | none |
| p3 snapshots | 215 | 215 | none |
| operation tests | 5 files | 5 files | none |
| test infra | .test/infra/ (5 files) | .test/infra/ (5 files) | snapshotHelpers.ts → snapshotOps.ts (rename) |
| spec tree | refs/state-tree.exact.md | extant | none |
| flag change | --to → --into | fully removed (not alias) | documented ✓ |
| alias | --apply | implemented | none |

---

## filediff comparison

### files blueprint declared — all created

| blueprint file | created | notes |
|----------------|---------|-------|
| `git.release._.get_one_goal_from_input.integration.test.ts` | ✓ | exists |
| `git.release._.get_all_flags_from_input.integration.test.ts` | ✓ | exists |
| `git.release._.get_one_transport_status.integration.test.ts` | ✓ | exists |
| `git.release._.emit_transport_status.integration.test.ts` | ✓ | exists |
| `git.release._.emit_transport_watch.integration.test.ts` | ✓ | exists |
| `.test/infra/setupTestEnv.ts` | ✓ | exists |
| `.test/infra/mockGh.ts` | ✓ | exists |
| `.test/infra/mockGit.ts` | ✓ | exists |
| `.test/infra/mockSequence.ts` | ✓ | exists |
| `.test/infra/snapshotHelpers.ts` | ✓ | exists as snapshotOps.ts (renamed) |

### files created but not in blueprint

none. all created files match blueprint (with one rename).

---

## codepath comparison

### operations documented in blueprint vs implementation

| operation | blueprint contract | implementation matches |
|-----------|-------------------|------------------------|
| get_one_goal_from_input | input/output/throws documented | ✓ |
| get_all_flags_from_input | input/output/defaults documented | ✓ |
| get_one_transport_status | input/output/adapters documented | ✓ |
| emit_transport_status | input/output/side effects documented | ✓ |
| emit_transport_watch | input/output/polls documented | ✓ |
| emit_one_transport_status_exitcode | input/exit codes documented | ✓ |

no codepath divergences. all operations match blueprint contracts.

---

## test coverage comparison

### p3 journey test counts

| file | blueprint declared | actual | divergence |
|------|-------------------|--------|------------|
| on_feat.into_main | 27 | 27 | none |
| on_feat.into_prod | 63 | 63 | none |
| on_feat.from_main | 49 | 49 | none |
| on_main.into_prod | 48 | 48 | none |
| on_main.into_main | 1 | 1 | none |
| on_main.from_feat | 27 | 27 | none |
| **total** | **215** | **215** | **none** |

**no divergence**: implementation matches blueprint prescription exactly.

### operation tests

| aspect | blueprint declared | actual |
|--------|-------------------|--------|
| test files | 5 | 5 |
| test count | 57 (estimated) | 57 (actual) |

**no divergence**: all 5 decomposed operation test files created:
- git.release._.get_one_goal_from_input.integration.test.ts
- git.release._.get_all_flags_from_input.integration.test.ts
- git.release._.get_one_transport_status.integration.test.ts
- git.release._.emit_transport_status.integration.test.ts
- git.release._.emit_transport_watch.integration.test.ts

---

## divergence resolution verification

the evaluation documents 2 minor divergences:

| # | divergence | resolution | rationale provided |
|---|------------|------------|-------------------|
| 1 | snapshotHelpers.ts → snapshotOps.ts | backup (rename) | ✓ follows *Ops.ts convention |
| 2 | --to deprecated → removed | backup | ✓ wish says "replace" not "alias" |

all divergences are documented with:
- clear identification of what diverged
- resolution type (backup = accept deviation)
- rationale that explains why the deviation is acceptable

---

## hostile reviewer check

**what would a hostile reviewer find?**

1. **why snapshotOps.ts instead of snapshotHelpers.ts?** — documented: follows *Ops.ts convention used in test infra
2. **why --to fully removed instead of deprecated?** — documented: wish line 219 says "replace `--to` with `--into`" = remove, not alias
3. **is coverage actually complete?** — yes, 215 snapshots matches blueprint prescription exactly

**no undocumented divergences found.**

---

## conclusion

| check | status |
|-------|--------|
| all divergences documented | ✓ |
| each divergence has resolution | ✓ |
| each divergence has rationale | ✓ |
| no hidden divergences | ✓ |

**the divergence analysis is complete.**
