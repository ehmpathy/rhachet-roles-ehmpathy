# review: has-divergence-analysis (r2)

## methodology

deeper analysis after r1. examined spec.tree.md row counts against actual test counts. traced each scene's test enumeration.

---

## spec tree vs actual test counts

### scene.1: on_feat.into_main

| source | declared | actual | match |
|--------|----------|--------|-------|
| blueprint | 27 | 27 | ✓ |

**why it holds**: 27 snapshots implemented as prescribed.

### scene.2: on_feat.into_prod

| source | declared | actual | match |
|--------|----------|--------|-------|
| blueprint | 63 | 63 | ✓ |

**why it holds**: 63 snapshots implemented as prescribed.

### scene.5: on_main.into_prod

| source | declared | actual | match |
|--------|----------|--------|-------|
| blueprint | 48 | 48 | ✓ |

**why it holds**: 48 snapshots implemented as prescribed.

---

## retry variant analysis

the blueprint counted retry variants as separate test cases. verified actual counts:

| scene | blueprint retry snapshots | actual | match |
|-------|---------------------------|--------|-------|
| scene.1 | 3 | 3 | ✓ |
| scene.2 | 9 | 9 | ✓ |
| scene.3+4 | 6 | 6 | ✓ |
| scene.5 | 6 | 6 | ✓ |
| scene.7 | 3 | 3 | ✓ |
| **total** | **27** | **27** | ✓ |

**why it holds**: retry variants implemented as prescribed. tested via `--retry` flag on failed state tests. all 27 retry snapshots accounted for in the grand total.

---

## rebase state analysis

the blueprint included rebase states (behind, dirty) in the count. verified actual coverage:

| scene | blueprint rebase tests | actual | match |
|-------|------------------------|--------|-------|
| scene.1 | 6 (2 states × 3 modes) | 6 | ✓ |
| scene.5 | 6 (2 states × 3 modes) | 6 | ✓ |

**why it holds**: rebase states fully covered. both behind and dirty states tested across all modes.

---

## extant test coverage (p1/p2)

| test file | snapshots | change from origin/main |
|-----------|-----------|-------------------------|
| p1 | 55 | flag rename `--to` → `--into` |
| p2 | 72 | flag rename `--to` → `--into` |

the evaluation documents 55+72=127 extant snapshots. verified against grep count.

**why it holds**: p1/p2 tests were updated for flag rename only. all extant behavior is preserved.

---

## summary of all divergences

| aspect | blueprint | actual | match | notes |
|--------|-----------|--------|-------|-------|
| p3 total | 215 | 215 | ✓ | exact match |
| scene.1 | 27 | 27 | ✓ | on_feat.into_main |
| scene.2 | 63 | 63 | ✓ | on_feat.into_prod |
| scene.3+4 | 49 | 49 | ✓ | on_feat.from_main |
| scene.5 | 48 | 48 | ✓ | on_main.into_prod |
| scene.6 | 1 | 1 | ✓ | on_main.into_main (error) |
| scene.7 | 27 | 27 | ✓ | on_main.from_feat |
| retry variants | 27 | 27 | ✓ | included in totals |
| rebase states | 12 | 12 | ✓ | behind + dirty |
| test infra files | 5 | 5 | ✓ | .test/infra/ |

### minor divergences (deferred)

| divergence | resolution | rationale |
|------------|------------|-----------|
| snapshotHelpers.ts → snapshotOps.ts | backup | renamed to follow `*Ops.ts` convention |
| --to deprecated → fully removed | backup | wish line 219 says "replace" not "alias" |

---

## hostile reviewer check (deeper)

1. **why exactly 215 snapshots?** — matches blueprint prescription exactly. enumerated row-by-row in spec.tree.md.
2. **are rebase states covered?** — yes, 12 tests across scenes (6 each for scene.1 and scene.5)
3. **is retry behavior tested?** — yes, 27 retry variants tested via `--retry` flag
4. **are watch cycles visible?** — yes, GIT_RELEASE_MOCK_SEQUENCE shows 3+ cycles
5. **test infra files?** — yes, 5 files in .test/infra/

**no undocumented divergences found in r2.**

---

## conclusion

| check | r1 | r2 |
|-------|----|----|
| all scene counts match | ✓ | ✓ (verified row-by-row) |
| retry variants accounted | ✓ | ✓ (27 total) |
| rebase coverage verified | not checked | ✓ (12 tests) |
| test infra verified | not checked | ✓ (5 files) |
| minor divergences documented | ✓ | ✓ (2 total) |

**divergence analysis is complete. implementation matches blueprint exactly (215 snapshots). only 2 minor divergences (file rename + flag removal).**
