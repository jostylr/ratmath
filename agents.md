# RatMath/RiX — Agent Guide

This document orients AI agents to the project structure and active work areas.

---

## Active Development: RiX (`rix/`)

**RiX (Rational Interval Expression Language)** is the primary focus of current development. All parser and evaluator changes belong here, not in the legacy packages.

### RiX Directory Structure

```
rix/
├── parser/        ← PRIMARY: Parser & Tokenizer (active, well-tested)
│   ├── src/
│   │   ├── tokenizer.js     — Maximal-munch tokenizer
│   │   ├── parser.js        — Pratt parser, produces AST
│   │   └── system-loader.js — System identifier/keyword config
│   ├── index.js             — Exports: tokenize, parse
│   ├── tests/               — 500+ tests (bun test)
│   ├── docs/                — Feature documentation
│   └── design/              — Language spec and design decisions
│
├── eval/          ← ACTIVE: Evaluator (Phase 3 in progress)
│   ├── src/
│   │   ├── ir.js            — IR format (~50 node constructors)
│   │   ├── lower.js         — AST → IR lowering pass (complete)
│   │   └── evaluator.js     — IR evaluator (Phase 3 target)
│   └── tests/               — 75+ lowering tests
│
├── web/           — Browser interface for RiX
└── tools/         — Utility tooling
```

use current working directory/tmp to store any temporary files. Do not use system /tmp. 

### RiX Development Status

| Phase | Component | Status |
|-------|-----------|--------|
| 1 | Parser & Tokenizer | ✅ Complete (501+ tests) |
| 2 | AST → IR Lowering | ✅ Complete (75 tests) |
| 3 | IR Evaluator | 🔧 In progress |

**Phase 3 work targets:** `rix/eval/src/evaluator.js` and `rix/eval/src/registry.js`

### RiX Key Conventions

- **ES modules:** `import`/`export` throughout
- **Test runner:** Bun (`bun test`)
- **Lowercase identifiers** = user scope; **Uppercase** = system/function scope
- **`:=`** for assignment, **`==`** for equality
- **`@_NAME`** prefix for system function calls in source code
- Brace sigils: `{=` map, `{?` case, `{;` block, `{|` set, `{:` tuple, `{@` loop, `{!` mutation
- When adding a new RiX system function/capability, assign it to an appropriate capability group in the runtime config so script sandboxing remains coherent

---

## Legacy / Support Packages (`packages/`)

These support the **old calc/webcalc system** (VariableManager-based). Do **not** make parser or evaluator changes here — use RiX instead.

| Package | Purpose |
|---------|---------|
| `packages/core/` | Core math types: `Integer`, `Rational`, `RationalInterval` |
| `packages/algebra/` | `VariableManager` — expression parser + evaluator (old system) |
| `packages/parser/` | Old expression parser (superseded by `rix/parser/`) |
| `packages/stdlib/` | Standard library for old calc |
| `packages/arith-funs/` | Arithmetic/number theory functions |
| `packages/reals/` | Transcendental/real number oracles |
| `packages/oracles/` | Oracle-based real number computation |
| `packages/units/` | Physical units support |
| `packages/calculus/`, `packages/stats/`, etc. | Domain math packages |

### Writing Packages for the Old Calc System

If you must add functionality to the old `calc`/`webcalc` apps, packages use `ratmath-module.js` with this shape:

```javascript
// packages/mypkg/src/ratmath-module.js
export const functions = {
    "MyFunc": {
        type: 'js',
        handler: function (arg) { /* 'this' = VariableManager */ return result; },
        params: ["arg"],
        doc: "Description"
    }
};
export const variables = { "MY_CONST": someValue };
```

Return types: `new Integer(BigInt(n))`, `new Rational(num, denom)`, `new RationalInterval(lo, hi)`, `{ type: 'string', value: str }`, `{ type: 'sequence', values: [...] }`.

Register in `packages/algebra/src/package-registry.js` and help in `packages/algebra/src/help-registry.js`.

---

## Apps (`apps/`)

| App | Description | Backend |
|-----|-------------|---------|
| `apps/calc/` | CLI calculator | Old VariableManager |
| `apps/webcalc/` | Web calculator | Old VariableManager |
| `apps/forge/` | Document/worksheet environment | Mixed |
| `apps/cel/` | Spreadsheet-like env | — |

---

## Where to Make Changes

| Task | Location |
|------|---------|
| Parser bug or new syntax | `rix/parser/src/parser.js` or `tokenizer.js` |
| New AST node type | `rix/parser/src/parser.js` + update `rix/eval/src/lower.js` |
| Evaluator / runtime | `rix/eval/src/evaluator.js` |
| IR format | `rix/eval/src/ir.js` |
| New math types | `packages/core/` |
| Old calc built-in function | `packages/stdlib/` or relevant package |
| Old calc package | `packages/algebra/src/package-registry.js` |

---

## Testing

```bash
# RiX parser tests (run from rix/parser/)
bun test

# RiX eval tests (run from rix/eval/)
bun test

# Full monorepo (from root)
bun test
```

All changes to `rix/` must keep existing tests green. Add tests for new functionality.

---

## Language Quick Reference

See `lang.md` for full Calc vs RiX syntax comparison. Key RiX syntax:

```rix
x = 3                        # assignment
f = x -> x^2 + 1              # function definition
y := 1..3/4                   # mixed number
z := 2:5                      # interval
x > 0 ?? x ?: -x              # ternary
[1 |+ 2 |^ 10]                # array generator
{= a=3}                        # map
```

Brace sigil is a common design for enclosing stuff. Code blocks use {; } and { }, loops are {@ }, {? } are conditionals, {= } are maps, {| } are sets, {: } are tuples. Spaces after the sigils are required unless a bracketed name which requires a space after. Currently arrays are just [].

See `rix/parser/design/` for complete language specification.
