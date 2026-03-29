# self-review r4: has-consistent-mechanisms

## mechanism consistency review

### the question

do we duplicate any patterns already in the codebase?

### search: similar briefs

**searched for:** briefs about verification, trust, claims

**found:**
- howto.logservation.[lesson].md — diagnosis via logs, not about claim verification
- howto.diagnose.[lesson].md — diagnosis techniques, not about inherited claims
- rule.require.test-covered-repairs.md — about test coverage for repairs

**conclusion:** no brief covers the "trust but verify" pattern for inherited claims.

**why it holds:**
- the lesson is new (originated from orphan processes incident)
- prior briefs cover diagnosis and test coverage, not claim verification
- "verify inherited claims before you act" is distinct from "write tests for repairs"

---

### search: similar hooks

**searched for:** postcompact hooks, session-related hooks

**found:**
- sessionstart.notify-permissions.sh — notifies about pre-approved permissions
- pretooluse.*.sh — various pre-tool-use hooks
- posttooluse.guardBorder.onWebfetch.sh — guards web fetch boundary

**conclusion:** no PostCompact hook exists. this is the first.

**why it holds:**
- PostCompact is a distinct event type
- no hook currently fires after compaction
- the mechanism (remind about stale claims) is new

---

### search: reusable patterns

**found and reused:**
| pattern | source | action |
|---------|--------|--------|
| brief structure (.what/.why/.the rule) | rule.require.test-covered-repairs.md | [REUSE] |
| hook file structure (#!/usr/bin/env bash header) | sessionstart.notify-permissions.sh | [REUSE] |
| hook registration | getMechanicRole.ts | [EXTEND] |
| boot.yml say section | boot.yml | [EXTEND] |

**why it holds:**
- blueprint decomposition section explicitly cites these patterns
- research stone (3.1.3.research.internal.product.code.prod._.v1.i1.md) documented patterns
- we extend, not duplicate

---

### mechanism-by-mechanism review

**brief (rule.require.trust-but-verify.md):**
- follows rule.require.* brief pattern
- sections match standard brief structure
- no duplicate functionality

**hook (postcompact.trust-but-verify.sh):**
- follows {event}.{purpose}.sh name convention
- uses standard bash header pattern
- emits to stdout (consistent with sessionstart.notify-permissions.sh)
- new functionality (PostCompact event), no duplication

**boot.yml registration:**
- extends say section (standard)
- no new mechanism

**getMechanicRole.ts registration:**
- extends hooks registration (standard)
- no new mechanism

---

## summary

| mechanism | duplicates prior? | verdict |
|-----------|-------------------|---------|
| brief content | no | [OK] new lesson |
| brief structure | no (reuses pattern) | [OK] consistent |
| hook functionality | no | [OK] first PostCompact hook |
| hook structure | no (reuses pattern) | [OK] consistent |
| registration | no (extends) | [OK] standard |

## conclusion

no duplicate mechanisms. blueprint reuses patterns and extends standard registration.

## what i'll remember

- search for similar mechanisms before the blueprint
- reuse patterns, extend registrations
- cite sources in decomposition section
