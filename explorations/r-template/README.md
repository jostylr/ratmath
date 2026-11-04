# `R` tagged template — prototype

`r.js` is a ~130-line exact-arithmetic tag built only on RatMath Core:

```js
import { R } from "./r.js";
R`1:2 + 3`;             // RationalInterval 4:5
R`(1/3 + ${x}) ^ 2`;    // ${x} is used as a Core value, never stringified
R`1.23[56:67] * 2`;     // literals use Core's parseNumber grammar
```

Precedence (loosest first): `+ -`, then `:` (interval), then `* /`, then unary
`-`, then `^` (right-associative, Integer exponent), then postfix `!`. This
matches RiX for the shared subset: `1/2:3/4` is `(1/2):(3/4)`, `1:2 + 3` is
`(1:2) + 3`. Interpolations may be Core values, bigints, safe integers or
literal strings; inexact JS numbers are rejected. Run `bun test` here.

## Which parser should a tag use?

| | `packages/parser` (legacy) | RiX parser (`rix/src/parser`) | this prototype |
|---|---|---|---|
| Status | Frozen legacy (AGENTS.md: no parser changes); 3,750-line single file; 649 tests pass | Active, full language | New, small |
| Has `R```/`F``` | Yes, but stringifies `${}` values and reparses them | No tag; `parseAndEvaluate` needs the whole evaluator/runtime | Yes, values kept |
| Scope | Calc grammar (e-notation, `IF`, base suffixes, functions) | Names, functions, collections, units, plugins | Numbers, intervals, `+ - * / ^ ! :` |
| Weight | Core + parser | Core + parser + evaluator + runtime | Core only |

Recommendation: for JavaScript explorations that replace `apps/calc` and
`apps/webcalc`, use a Core-only tag like this one (numbers and exact
arithmetic, no language), and offer a second tag that delegates to RiX
(`parse` + `lower` + `evaluate`, with `${}` values bound as fresh variables)
when an exploration needs functions or collections. Avoid building new work on
`packages/parser`: it duplicates both grammars and is not maintained.

If kept, `r.js` could move into Core (`src/r-template.js`, exported as `R`) —
it depends only on `parseNumber` and the value classes.
