### .rule = forbid-term-normalize

#### .what
the term `normalize` is forbidden — it is overloaded and vague

#### .scope
- code: variable names, function names, comments
- files: filenames, directory names
- docs: markdown, briefs, prompts
- comms: commit messages, pr descriptions

#### .why
- `normalize` suffers from severe semantic diffusion
- when everything can be "normalized", nothing is clearly communicated
- forces the reader to guess which meaning was intended
- hides the actual transformation being performed

#### .purposes conflated by "normalize"

the term is used for at least 8 distinct purposes:

| purpose       | what it means                          | example `asX` alternative    |
| ------------- | -------------------------------------- | ---------------------------- |
| **format**    | convert to standard display format     | `asE164`, `asIso8601`        |
| **canonical** | reduce to unique form for comparison   | `asSha256`, `asComparable`   |
| **sanitize**  | clean untrusted input                  | `asTrimmed`, `asEscaped`     |
| **scale**     | adjust numeric range                   | `asUnitVector`, `asScaled`   |
| **case**      | convert letter case                    | `asLowercase`, `asCamelCase` |
| **encode**    | convert to specific character form     | `asNfc`, `asUtf8`            |
| **resolve**   | resolve relative to absolute           | `asAbsolute`, `asRealpath`   |
| **collapse**  | reduce redundancy                      | `asCollapsed`, `asDeduped`   |
| **expand**    | fill in defaults or implicit values    | `asExplicit`, `asExpanded`   |

when someone says "normalize", they could mean any of these — or several at once.

#### .enforcement
use of `normalize` = **BLOCKER**

#### .pattern: `asX`

the recommended alternative is the `asX` pattern:
- describes the **target form**, not a vague action
- self-documenting: `asE164` tells you exactly what you get
- composable: `input.asTrimmed().asLowercase()`
- reads naturally: "give me this value as X"

#### .common usecases

| 👎 vague              | 👍 precise          | .what it actually does                   |
| -------------------- | ------------------ | ---------------------------------------- |
| `normalizePhone`     | `asE164`           | format to E.164 international standard   |
| `normalizeEmail`     | `asLowercase`      | lowercase (emails are case-insensitive)  |
| `normalizeString`    | `asTrimmed`        | remove leading/trailing whitespace       |
| `normalizePath`      | `asAbsolute`       | resolve to absolute path                 |
| `normalizeUrl`       | `asCanonical`      | dedupe trailing slashes, sort params     |
| `normalizeDate`      | `asIso8601`        | format to ISO 8601 string                |
| `normalizeTimestamp` | `asUtc`            | convert to UTC timezone                  |
| `normalizeCase`      | `asCamelCase`      | convert to camelCase                     |
| `normalizeSlug`      | `asKebabCase`      | convert to kebab-case for urls           |
| `normalizeJson`      | `asSorted`         | sort keys deterministically              |
| `normalizeUnicode`   | `asNfc`            | unicode normalization form C             |
| `normalizeWhitespace`| `asCollapsed`      | collapse multiple spaces to single       |
| `normalizeNumber`    | `asScaled`         | scale to specific range (e.g., 0-1)      |

#### .examples

**👎 bad**
```ts
const normalizePhone = (phone: string) => { ... };
const normalizedEmail = normalize(email);
const data = normalizeInput(rawData);
```

**👍 good**
```ts
const asE164 = (phone: string) => { ... };
const emailLowercased = asLowercase(email);
const data = asTrimmed(rawData);

// or as methods
const phone = input.phone.asE164();
const email = input.email.asLowercase();
```

#### .note: be specific

when `asX` still feels vague, get more specific:

| 👎 vague      | 👍 specific          |
| ------------- | ------------------- |
| `asFormatted` | `asE164`            |
| `asCleaned`   | `asTrimmed`         |
| `asStandard`  | `asIso8601`         |

#### .pattern: `as${DomainObject}`

when a domain object exists for the target form, use it:

```ts
// domain objects as target forms
const priceStandard = asIsoPrice(input);
const phoneStandard = asPhoneE164(input);
const dateStandard = asIsoDate(input);

// cast to domain object
const customer = asCustomer(rawData);
const invoice = asInvoiceDraft(formData);
```

domain object + variant for even more precision:

```ts
// IsoPrice in different representations
const forDisplay = asIsoPriceHuman(price);   // "$1,234.56"
const forSpeech = asIsoPriceWords(price);    // "one thousand two hundred thirty four dollars"
const forStorage = asIsoPriceShape(price);   // { amount: 123456, exponent: -2, currency: 'USD' }
```

the goal: `asX` tells you exactly what form you'll get.

#### .see also
- `rule.require.ubiqlang` — use precise domain terms
- `rule.forbid.term-script` — similar overloaded term
- `rule.forbid.buzzwords` — semantic diffusion hazard
