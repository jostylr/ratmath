# RiX Phase 3: Evaluator Implementation Plan

## What Was Done (Phases 1-2 Complete)

### Phase 1: Parser & Tokenizer Unification
- **Tokenizer (`rix/parser/src/tokenizer.js`)**: Added `@_` system function prefix, brace sigils (`{=`, `{?`, `{;`, `{|`, `{:`, `{@`, `{!`), `..`/`.|`/`|.` operators, `0z[N]` custom base syntax
- **Parser (`rix/parser/src/parser.js`)**: Implemented all Phase 1 syntax features:
  - Assignment: `=` and `:=` (precedence 20, right-assoc), `==` for equality
  - Identifier case: lowercase `f(x)` = implicit multiplication, uppercase `F(x)` = function call
  - System access: `@_NAME(...)` → `SystemCall`, `@_NAME` → `SystemFunctionRef`
  - Brace sigil containers: `MapContainer`, `CaseContainer`, `BlockContainer`, `SetContainer`, `TupleContainer`, `LoopContainer`
  - External properties: `obj..b` → `ExternalAccess`, `obj.|` → `KeySet`, `obj|.` → `ValueSet`
  - Deferred blocks: `@{...}` → `DeferredBlock`
  - Mutation: `obj{= ...}` (copy) and `obj{! ...}` (in-place) → `Mutation`
  - REPL commands: `HELP topic` → `CommandCall`
- **15 new AST node types** added
- **501 tests passing** (53 Phase 1A + 44 Phase 1B + 404 original)
- **Documentation**: `rix/parser/design/phase1-syntax.md` (complete syntax reference)

### Phase 2: Lowering Pass (AST → IR)
- **Created `rix/eval/` package** with proper workspace integration
- **IR format (`rix/eval/src/ir.js`)**: Flat tree `{ fn: "NAME", args: [...] }` with 40+ convenience constructors
- **Lowering pass (`rix/eval/src/lower.js`)**: Maps all 55 AST node types to ~50 system function IR nodes
  - Literals → `LITERAL`, `STRING`, `NULL`
  - Variables → `RETRIEVE`, `ASSIGN`, `PLACEHOLDER`
  - Arithmetic → `ADD`, `SUB`, `MUL`, `DIV`, `POW`, `NEG`
  - Comparison → `EQ`, `NEQ`, `LT`, `GT`, `LTE`, `GTE`
  - Functions → `CALL`, `LAMBDA`, `FUNCDEF`, `PATTERNDEF`
  - Control → `BLOCK`, `CASE`, `LOOP`, `TERNARY` (with `DEFER` for lazy args)
  - Collections → `ARRAY`, `SET`, `MAP`, `TUPLE`, `INTERVAL`
  - Properties → `DOT`, `INDEX`, `EXTGET`, `EXTALL`, `KEYS`, `VALUES`
  - Mutation → `MUTCOPY`, `MUTINPLACE`
  - Pipes → `PIPE`, `PMAP`, `PFILTER`, `PREDUCE`
  - System → `@_ADD(a,b)` lowers directly to `{fn:"ADD", args:[...]}` (no indirection)
  - REPL → `COMMAND("HELP", ...)`, `COMMAND("LOAD", ...)`
- **75 lowering tests passing** covering all categories
- **Documentation**: `rix/eval/design/ir-format.md` (complete IR reference)
- **Full project**: 1975 pass, 0 fail (2110 total with 134 todo)

## What Needs to Be Done (Phase 3: Evaluator)

### Core Architecture

1. **System Function Registry (`rix/eval/src/registry.js`)**
   - Map of IR function names → implementations
   - Support for registration, lookup, and override (for debugging)
   - Built-in implementations for all ~50 system functions
   - Error handling for unknown functions

2. **IR Evaluator (`rix/eval/src/evaluator.js`)**
   - Walk IR tree recursively
   - Dispatch to system function registry
   - Handle deferred execution (`DEFER` nodes)
   - Manage evaluation context (scope chain, environment)
   - Error propagation and stack traces

3. **Evaluation Context (`rix/eval/src/context.js`)**
   - Variable storage (scope chain)
   - Environment variables (`_precision`, etc.)
   - Call stack for debugging
   - Module/package management hooks

### System Function Implementations

4. **Core Functions (`rix/eval/src/functions/`)**
   - `core.js`: `LITERAL`, `STRING`, `NULL`, `RETRIEVE`, `ASSIGN`, `NOP`
   - `arithmetic.js`: `ADD`, `SUB`, `MUL`, `DIV`, `INTDIV`, `MOD`, `POW`, `NEG`
   - `comparison.js`: `EQ`, `NEQ`, `LT`, `GT`, `LTE`, `GTE`
   - `logic.js`: `AND`, `OR`, `NOT`

5. **Control Flow (`rix/eval/src/functions/control.js`)**
   - `BLOCK`: Sequential execution
   - `CASE`: Pattern matching with lazy evaluation
   - `LOOP`: Loop construct with lazy args
   - `TERNARY`: Conditional with lazy branches
   - `DEFER`: Lazy evaluation wrapper

6. **Collections (`rix/eval/src/functions/collections.js`)**
   - `ARRAY`, `SET`, `MAP`, `TUPLE`, `INTERVAL`
   - `MATRIX`, `TENSOR` (if needed)
   - Integration with RatMath number types

7. **Functions (`rix/eval/src/functions/functions.js`)**
   - `CALL`: User function invocation
   - `LAMBDA`: Anonymous functions
   - `FUNCDEF`: Named function definitions
   - `PATTERNDEF`: Pattern matching functions
   - Parameter handling (positional, keyword, defaults, conditionals)

8. **Properties & Mutation (`rix/eval/src/functions/properties.js`)**
   - `DOT`, `INDEX`: Property access
   - `DOT_ASSIGN`, `INDEX_ASSIGN`: Property assignment
   - `EXTGET`, `EXTSET`, `EXTALL`, `KEYS`, `VALUES`: External properties
   - `MUTCOPY`, `MUTINPLACE`: Object mutation

9. **Pipes (`rix/eval/src/functions/pipes.js`)**
   - `PIPE`, `PIPE_EXPLICIT`: Value piping
   - `PMAP`, `PFILTER`, `PREDUCE`: Collection pipelines

10. **Advanced (`rix/eval/src/functions/advanced.js`)**
    - `SOLVE`, assertions (`ASSERT_LT`, etc.)
    - `DERIVATIVE`, `INTEGRAL`: Calculus
    - Interval operations (`STEP`, `DIVIDE`, etc.)
    - Units (`UNIT`, `MATHUNIT`)

11. **REPL (`rix/eval/src/functions/repl.js`)**
    - `COMMAND`: Dispatch HELP/LOAD/UNLOAD
    - Integration with existing calc package system

### Integration & Testing

12. **Main Evaluator (`rix/eval/src/index.js` updates)**
    - Export `evaluate(ir, context)` function
    - Convenience: `parseAndEvaluate(code)` pipeline

13. **Tests (`rix/eval/tests/`)**
    - `evaluator.test.js`: Core evaluation tests
    - `functions/*.test.js`: Per-category system function tests
    - `integration.test.js`: End-to-end parsing → lowering → evaluation
    - Test coverage for all system functions

14. **Integration with RatMath**
    - Use RatMath number types (Integer, Rational, RationalInterval)
    - Import existing stdlib functions from calc
    - Preserve precision and exact arithmetic

### Documentation

15. **Update Documentation**
    - `rix/eval/README.md`: Usage guide
    - `rix/eval/design/evaluator.md`: Architecture overview
    - Update `rix/parser/design/merger-analysis.md` with Phase 3 status

### Success Criteria

- **All system functions implemented and tested**
- **Parse → Lower → Evaluate pipeline working**
- **Integration with RatMath number types**
- **REPL commands functional (HELP, LOAD, UNLOAD)**
- **Performance comparable to existing calc**
- **Full test coverage**
- **No regressions in existing tests**

## Key Design Decisions to Maintain

1. **Flat IR tree** - Every node is `{ fn, args }`
2. **Lazy evaluation** - `DEFER` nodes for control flow branches
3. **Direct system mapping** - `@_ADD(a,b)` bypasses lowering
4. **Configurable registry** - Functions can be swapped for debugging
5. **RatMath integration** - Preserve exact arithmetic
6. **Backward compatibility** - Existing calc functionality preserved
