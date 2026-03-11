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
    - **Naming Convention**: **camelCase** is strongly recommended (e.g., `myVar`, `calculateScale`).
    - **Underscores**: `_` is a valid character in identifiers (e.g. `snake_case`, `_private`). However, a standalone `_` is the **null operator** (same as `NULL()`).

> [!WARNING]
> **Conflict**: `calc` enforcing strict lowercase for variables and uppercase for functions is a hard constraint in the current `VariableManager`. 
> **Resolution**: For cross-compatibility, prefer **lowercase/camelCase/snake_case** for variables and **Uppercase** for functions.

---

## 2. Comments

### Agreed Syntax
- None fully agreed.

### Divergences & Conflicts
- **Calc**:
    - Uses `#` for line comments (e.g., `# This is a comment`).
- **RiX**:
    - **Line Comment**: Uses `##` (double hash) for line comments.
    - **Multi-line Comment**: Uses `##tag##...##tag##` for block comments. Tags are case-insensitive and cannot contain whitespace.

```rix
## This is a line comment

##MATH##
This is a multi-line 
block comment with a tag.
##MATH##
```

---

## 3. Assignments

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
> **RiX Proposal**: `x := 3` or `x = 3` (Assignment), `x == 3` (Equality Check). `RiX` also supports combo operators `+=`, `-=`, `*=`, `/=`, `//=`, `%=`, `^=`.
> To explicitly assign to or retrieve from a variable *outside the innermost scope*, use the `@` prefix: `@x += 1` or `y = @x`. This prevents local scope shadowing within lambdas.
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
    - **RiX**: `2:5` (Interval). Also supports chained betweenness checks like `2:3:5`.
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
## Both of these are identical:
Square(x) -> x ^ 2
Square(x) :-> x ^ 2

## Multi-argument:
Avg(a, b) -> (a + b) / 2
Avg(a, b) :-> (a + b) / 2
```

- `(x) -> body` (parenthesized params with no preceding name) = **lambda** (anonymous function)
- `Name(x) -> body` or `Name(x) :-> body` = **named function definition** (FUNCDEF)
- `f = (x) -> body` = **assign lambda to variable** (also valid)

### Self Reference

Inside a function body, bare `$` refers to the currently executing callable.

```rix
CountDown := n -> n > 0 ?? $(n - 1) ?: 0
Fact := (n, acc ?| 1) -> n > 1 ?? $(n - 1, acc * n) ?: acc
Named := x -> $.label
Named.label = 42
```

- `$(args...)` self-calls the current callable object.
- `$.prop` and `$..` use the normal meta/property rules on that callable.
- `$` is invalid outside a function body.

### Tail Self Call Optimization

RiX only optimizes direct tail self calls of the form `$(...)`.

```rix
Good := n -> n > 0 ?? $(n - 1) ?: 0
GoodFact := (n, acc ?| 1) -> n > 1 ?? $(n - 1, acc * n) ?: acc
BadFact := n -> n > 1 ?? n * $(n - 1) ?: 1
```

- `Good` and `GoodFact` are optimized because the self call result is returned directly.
- `BadFact` is not optimized because work remains after the self call returns.
- RiX does not do general tail-call optimization or mutual tail recursion.

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
- `AND(args...)` (alias `&&`), `OR(args...)` (alias `||`), `NOT(a)` (alias `!`)

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

## 8. RiX Features

- **Syntax Sugar**: `:=` for assignment, `|>` with `|>/`, `|>//`, `|>/|`, `|>#|` for pipes (slicing, splitting, chunking), `&&`/`||`/`!` for logic.
- **Symbolic Algebra**: `\/` (Union/Hull), `/\` (Intersect), `\` (Diff), `<>` (SymDiff), `?` (Member), `!?` (NotMember), `?&` (Intersects), `**` (SetProd), `++` (Concat).
- **N-ary Operators**: `{+ a, b, ...}` and `{* a, b, ...}` brace sigils for N-ary addition/concatenation and multiplication.
- **System Function Aliases**: `@+` → `ADD`, `@*` → `MUL` to directly retrieve system functions.
- **Partial Functions**: First-class support for partial application using placeholders `_1`, `_2`, etc. (e.g., `Double = @*(_1, 2)`). Supports argument reordering (`@-(_2, _1)`) and duplication (`@*(_1, _1)`).
- **Betweenness**: Chained colon operator `a:b:c` for checking if `b` is between `a` and `c` (inclusive). This includes any n-ary betweenness checks as well as nested intervals and sets of numbers and intervals. 
- **Generators**: Array generators (`[1 |+ 2 |^ 10]`).
- **Regex Literals**: First-class support with `{/pattern/flags?mode}` syntax. Supported modes include `ONE`, `TEST` (`?`), `ALL` (`*`), and `ITER` (`:`)
- **REPL Dot-Commands**: Advanced tooling with `.vars`, `.fns`, `.load[pkg]`, `.Print(args)`, and robust Ctrl-C handling.

## 9. Future Features

- **Units**: First-class support (`~[m]`).
- **Complex Numbers**: `~{i}` syntax.
- **Pattern Matching**: Function dispatch based on conditions.
