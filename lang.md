# RatMath / RiX Language Guide

This guide specifies the language used in `ratmath`'s calculator environment (`calc` / `webcalc`) and the proposed `RiX` language. It groups features by category, prioritizing agreed-upon syntax, followed by divergent syntax and conflicts.

> [!NOTE]
> **RiX** refers to the new parser/language specification found in `rix/`.
> **Calc** refers to the current implementation in `apps/calc` and `apps/webcalc`.

---

## 1. Identifiers and Case Sensitivity

### Agreed Syntax
- **Variable Names**: Generally start with a letter.
- **System Functions**: System-wide functions are standardly Uppercase (e.g., `SIN`, `COS`, `MAP`).

### Divergences & Conflicts
- **Calc**:
    - **Variables**: Strictly **lowercase** (e.g., `x`, `my_var`). Starts with `[a-z_]`.
    - **Functions**: Strictly **Uppercase** (e.g., `MyFunc`). Starts with `[A-Z]`.
    - **Normalization**: `foo` -> `foo`, `Foo` -> `FOO`. `_Foo` -> `_FOO` vs `_foo` -> `_foo`.
    - **@ Prefix**: Used internally or for disambiguation (e.g., `@MyFunc`).
- **RiX**:
    - **Identifiers**: Unicode support. Case-sensitive first letter distinction is similar to Calc (System vs User scope).
    - **System vs User**: Often distinguishes by case, but RiX parsers might be more flexible with "User" vs "System" identifiers in AST.

> [!WARNING]
> **Conflict**: `calc` enforcing strict lowercase for variables and uppercase for functions is a hard constraint in the current `VariableManager`. RiX might allow `myFunc`.
> **Resolution**: Follow `VariableManager` rules for now: **Variables = lowercase, Functions = Uppercase**.

---

## 2. Assignments

### Agreed Syntax
- None fully agreed for all contexts, but `=` is common.

### Divergences & Conflicts
- **Calc**:
    - `var = expr` (e.g., `x = 5`).
    - `Func = args -> body` (e.g., `F = (x) -> x^2`).
    - `Func(args) -> body` (definition syntax, e.g., `F(x) -> x^2`).
- **RiX**:
    - `:=` for assignment (e.g., `x := 3`).
    - `f(x) := x^2` or `f := (x) -> x^2`.
    - `:<` / `:>` for assertions.
    - `?=` for boolean checks (equality test).

> [!IMPORTANT]
> **Conflict**: `calc` uses `=` for assignment. `RiX` proposes `:=` to distinguish from equality checks (`=` or `==`).
> **RiX Proposal**: `x := 3` (Assignment), `x = 3` (Equality Check or Equation).
> **Current Calc**: `x = 3` (Assignment), `EQ(x, 3)` (Equality).

---

## 3. Numbers and Units

### Agreed Syntax
- **Integers**: `123`, `-5`.
- **Decimals**: `3.14`, `0.5`.
- **Rationals**: `1/2`, `3/4`.
- **Scientific Notation**: `1.2e-5`.

### Divergences
- **Mixed Numbers**:
    - **Calc**: `1..1/2` (parsed as `1 + 1/2`).
    - **RiX**: `1..3/4`.
- **Intervals**:
    - **Calc**: `1:5` (Rational Interval).
    - **RiX**: `2:5`.
- **Units**:
    - **Calc**: No native syntax, uses `units` package functions (e.g., `CONVERT(val, "m", "ft")`).
    - **RiX**: Postfix syntax proposed: `3.2~[m]` (scientific), `2~{i}` (mathematical).
- **Bases**:
    - **Calc**:
        - Input: `0b101` (bin), `0xFA` (hex), `0o7` (oct).
        - Custom: `101[2]`.
    - **RiX**: `101[2]` supported. `0x...` likely supported by tokenizer.

---

## 4. Collections and Data Structures

### Agreed Syntax
- **Lists**: `[1, 2, 3]`.

### Divergences
- **Matrices**:
    - **RiX**: `[[1, 2; 3, 4]]`.
    - **Calc**: Not natively verified in `stdlib`, usually lists of lists.
- **Maps**:
    - **RiX**: `{= a=3, b=6 }`.
    - **Calc**: Objects supported via `ObjectFunctions` (`Set(P, "a", 1)`), but literal syntax `{a=1}` is parsed as object property sets in expressions?
- **Sets**:
    - **RiX**: `{| 1, 2, 3 |}`.
    - **Calc**: lists often used as sets.

---

## 5. Functions and Lambdas

### Agreed Syntax
- **Arrow Functions (lambdas)**: `(args) -> body`.
- **Application**: `F(x)`.

### Named Function Definitions
Both `->` and `:->` are valid for named function definitions (mirroring `=` vs `:=` for assignment):

```
# Both of these are identical:
Square(x) -> x ^ 2
Square(x) :-> x ^ 2

# Multi-argument:
Avg(a, b) -> (a + b) / 2
Avg(a, b) :-> (a + b) / 2
```

- `(x) -> body` (parenthesized params with no preceding name) = **lambda** (anonymous function)
- `Name(x) -> body` or `Name(x) :-> body` = **named function definition** (FUNCDEF)
- `f = (x) -> body` = **assign lambda to variable** (also valid)

### Divergences
- **Pattern Matching**:
    - **RiX**: `abs :=> [(x ? x >= 0) -> x, (x ? x < 0) -> -x]`.
    - **Calc**: Uses `IF` inside body: `Abs(x) -> IF(x >= 0, x, -x)`.
- **Pipe Operator**:
    - **RiX**: `|>` supported.
    - **Calc**: Not currently supported.

---

## 6. Control Flow

### Agreed Syntax
- **Ternary/Conditional**: Logic exists, syntax differs.

### Divergences
- **Calc**:
    - `IF(cond, true, false)`.
    - `MULTI(e1, e2, ...)` (Sequence execution).
    - `SUM`, `PROD` (Iterative).
    - `MAP`, `FILTER`, `REDUCE` (Functional iteration).
- **RiX**:
    - `cond ?? true ?: false`.
    - `(cond ? val)` (Pattern matching guard).
    - Loops: `Do(x)` mentioned in scratchpad.

---

## 7. Built-in Functions (Calc/StdLib)

The `calc` environment provides these via `stdlib` and `algebra` packages.

### Core
- `ASSIGN(name, val)`
- `GLOBAL(name, val)`
- `IF(cond, true, false)`
- `MULTI(exprs...)`
- `GETVAR(name, level?)`

### Logic
- `EQ(a, b)`, `NEQ(a, b)`
- `GT(a, b)`, `GX(a, b)`, `GTE(a, b)`, `LTE(a, b)`
- `AND(args...)`, `OR(args...)`, `NOT(a)`

### List Operations
- `LEN(list)`
- `GETEL(list, index)`
- `FIRST(list)`, `LAST(list)`
- `IRANGE(start, end, step?)`
- `RANGE(interval, numSteps)`
- `MAP(list, func)`
- `FILTER(list, pred)`
- `REDUCE(list, func, init)`
- `SOME(list, pred)`, `ALL(list, pred)`

### String Operations
- `STRLEN(str)`, `CONCAT(strs...)`
- `SUBSTR(str, start, len?)`
- `INDEXOF(str, search)`
- `UPPER(str)`, `LOWER(str)`, `TRIM(str)`
- `REPLACE(str, search, replace)`
- `SPLIT(str, delim)`, `JOIN(list, delim)`
- `TOSTR(val)`
- `STARTSWITH(str, pre)`, `ENDSWITH(str, suf)`, `CONTAINS(str, search)`
- `REPEAT(str, n)`, `REVERSE(str)`
- `CHARAT(str, i)`, `CHARCODE(str, i)`, `FROMCHARCODE(codes...)`

### Object/Meta
- `Info(P)`: Get debug info.
- `Get(P, prop)`, `Set(P, prop, val)`, `Has(P, prop)`, `Del(P, prop)`.
- `Type(P)`, `Props(P)`, `CopyProps(src, dst)`, `ClearProps(P)`.

### Reals (Package)
- `PI`, `E`
- `Sin`, `Cos`, `Tan`, `Arcsin`, `Arccos`, `Arctan`
- `Exp`, `Ln`, `Log`
- `Root`, `Pow`

### ArithFuns (Package)
- Polynomials: `Poly`, `PolyEval`, `PolyDer`, `PolyInt`, `PolyRatRoots`...
- Number Theory: `Gcd`, `Lcm`, `Factor`, `IsPrime`, `ModPow`, `Fibonacci`...
- Rational Funcs: `RatFunc`, `PartialFrac`...
- Piecewise: `Step`, `Rect`, `Piecewise`...

---

## 8. Proposed Features (RiX to Integrate)

- **Syntax Sugar**: `:=` for assignment, `|>` for pipes.
- **Units**: First-class support (`~[m]`).
- **Complex Numbers**: `~{i}` syntax.
- **Pattern Matching**: Function dispatch based on conditions.
- **Generators**: Array generators (`[1 |+ 2 |^ 10]`).

---

## 9. Conflict Resolution Strategy

1.  **Assignments**: `calc` uses `=`. `RiX` wants `:=`.
    - *Plan*: Support both? Or migrate `calc` to allow `:=`.
2.  **Equality**: `calc` uses `EQ()`. `RiX` wants `?=` or `=`.
    - *Plan*: Ideally standard math `=` for equality check in boolean context, but `:=` for assignment avoids ambiguity. `calc` currently parses `a = b` as assignment.
3.  **Functions**: `calc` requires Uppercase. `RiX` allows flexible.
    - *Plan*: `calc`'s `VariableManager` logic is strict. Keep Uppercase for "Functions" (macros/lambdas) to distinguish from variables.

