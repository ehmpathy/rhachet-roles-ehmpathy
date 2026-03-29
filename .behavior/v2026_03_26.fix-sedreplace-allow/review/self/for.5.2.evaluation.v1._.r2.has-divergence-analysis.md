# self-review round 2: has-divergence-analysis (deeper)

## objective

hostile reviewer pass: what divergences would an adversarial reviewer find?

## line-by-line comparison of security-critical code

### command substitution check

blueprint line 135:
```bash
if echo "$CMD" | grep -qE '\$\(|`'; then
```

implementation line 61:
```bash
if echo "$CMD" | grep -qE '\$\(|`'; then
```

**verdict**: exact match.

### quote strip logic

blueprint line 140:
```bash
CMD_STRIPPED=$(echo "$CMD" | sed "s/'[^']*'//g" | sed 's/"[^"]*"//g')
```

implementation line 74:
```bash
CMD_STRIPPED=$(echo "$CMD" | sed "s/'[^']*'//g" | sed 's/"[^"]*"//g')
```

**verdict**: exact match.

### operator detection

blueprint line 143:
```bash
if echo "$CMD_STRIPPED" | grep -qE '[|;&]|&&|\|\||<\(|>\(|[^<]>|>>'; then
```

implementation line 86:
```bash
if echo "$CMD_STRIPPED" | grep -qE '[|;&]|&&|\|\||<\(|>\(|[^<]>|>>'; then
```

**verdict**: exact match.

## edge case analysis

### what about escaped quotes?

input: `rhx --old "foo \" | evil"`

sed behavior: treats `\"` as closing quote (doesn't understand bash escaping), leaves `| evil"` visible.

result: operator detected → pass-through (conservative, safe).

**verdict**: implementation is conservative. when uncertain, it does NOT auto-approve.

### what about mismatched quotes?

input: `rhx --old "foo | evil`

sed behavior: no closing `"` found, no content removed.

result: operator detected → pass-through (safe).

**verdict**: mismatched quotes are handled safely.

### what about nested quotes?

input: `rhx --old "foo 'bar' baz"`

sed behavior: inner `'bar'` removed first, then outer `"foo  baz"` removed.

result: all quoted content removed, no operators visible, safe → allow.

bash reality: `"foo 'bar' baz"` is a single argument with literal single quotes inside.

**verdict**: correct behavior.

## potential divergences examined

| potential issue | examination | verdict |
|-----------------|-------------|---------|
| redirect at start of line | `[^<]>` requires char before `>`, but rhx prefix always comes first | not an issue |
| escaped quotes | sed doesn't handle `\"`, but errs on side of caution | safe |
| mismatched quotes | no content removed, operators visible | safe |
| empty command after strip | grep would find no matches, command allowed | edge case tested (E2) |

## hostile reviewer findings

none found. the security-critical regexes match exactly between blueprint and implementation. edge cases err on the conservative side (pass-through rather than allow).

## why this holds

- compared actual source code against blueprint line-by-line
- examined edge cases that could create divergent behavior
- implementation is conservative: when uncertain, does NOT auto-approve
- all security regexes are identical between blueprint and implementation

