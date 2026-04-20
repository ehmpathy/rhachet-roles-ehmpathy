# self-review: has-pruned-backcompat

reviewed for unrequested backwards compatibility.

---

## backcompat concerns in blueprint

### concern.1: extant rmsafe interface unchanged

**what blueprint says:** input (unchanged) — same args work
**did wisher request?** implicit — wish says "when someone calls rmsafe"
**evidence needed?** no — change is additive (trash + output), not a break
**verdict:** not backcompat concern — interface is same

### concern.2: extant output format preserved

**what blueprint says:** turtle + shell structure retained
**did wisher request?** no explicit
**evidence needed?** yes — are there consumers of rmsafe output?
**verdict:** ISSUE — is output format a contract?

**analysis:** rmsafe output is for human consumption. no machine parse expected. but test snapshots verify format.

**decision:** keep format — snapshots are the contract. change format = update snapshots.

### concern.3: error exit codes preserved

**what blueprint says:** `[○] retain` for error paths
**did wisher request?** no
**evidence needed?** are exit codes used by callers?
**verdict:** keep — exit codes are implicit contract

---

## backcompat NOT mentioned

### could break: crickets output

**what if:** change crickets output format?
**evidence:** snapshot tests verify it
**decision:** keep — snapshot is contract

### could break: file removal order

**what if:** change order files are removed in glob?
**evidence:** no dependency on order
**decision:** n/a — order doesn't matter

---

## found issues

### issue: output format as implicit contract

**question:** is output format a change concern?
**answer:** snapshots verify it. any change updates snapshots. reviewable in PR.
**decision:** acceptable — snapshots make it explicit

---

## non-issues (why they hold)

| concern | why it holds |
|---------|--------------|
| interface unchanged | additive change only |
| output format | snapshots verify |
| exit codes | implicit contract, retained |
| crickets | snapshot verified |

---

## conclusion

no unrequested backcompat concerns. output format is implicit contract via snapshots. all behavior changes are additive.
