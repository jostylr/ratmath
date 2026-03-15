# Introduction to RiX

Welcome to RiX! RiX is the expressive scripting language designed for the RatMath arithmetic environment. Its syntax is built to be concise, functional, and deeply oriented around mathematical investigation.

This guide introduces the core features and idiosyncrasies of RiX to get you comfortable with the language quickly.

---

## Basics & Syntax

### Identifiers: Capital vs Lowercase
In RiX, the casing of the very first letter of an identifier carries semantic weight:

- **Variables** should start with a lowercase letter (e.g., `x`, `myVar`, `my_var`). **camelCase** or **snake_case** are recommended.
- **User-defined functions** start with an uppercase letter (e.g., `Square`, `MyFn`).
- **System capabilities** (built-in functions like `ADD`, `RAND_NAME`, `SIN`) are **not** accessible as bare identifiers. They must be called via the **system object** using the dot prefix: `.ADD(3, 4)`, `.SIN(x)`, `.RAND_NAME()`.

> [!NOTE]
> Standalone `_` is the **null operator** (same as `NULL()`). However, `_` is allowed within identifiers as long as it's not the only character.

> [!NOTE]
> Case normalization: only the first letter's case is significant. Beyond the first letter, identifiers are case-insensitive — so `myVar`, `myvar`, and `myVAR` all refer to the same variable. Similarly, `Square` and `SQUARE` are the same user function.


### Setting Up Variables and Scopes
#### Assignment and the Cell Model

A variable in RiX names a **cell** — a mutable container holding a value and meta properties. Different assignment operators control whether you share, copy, or update a cell.

**`=` — Alias / Rebind.** Makes the left-hand side point to the same cell as the right-hand side. If the right side is a variable, both names share the same cell; if it is an expression, a fresh cell is created for the result.

```rix
x := 5
y = x        ## y and x share the same cell
x += 1       ## both x and y see 6
```

**`:=` — Fresh Copy.** Creates a new, independent cell with a shallow copy of the value and all meta properties.

```rix
x := 5
y := x       ## y gets its own copy
x += 1       ## x is 6, y is still 5
```

**`~=` — In-Place Value Replacement.** Replaces the value inside the existing cell. This preserves cell identity, so aliases still track the change. Ordinary meta (`.key`, `.lock`) is preserved; ephemeral meta (`._mutable`, `._spec`) is replaced wholesale from the right-hand side; sticky meta (`.__units`) is preserved unless the right-hand side supplies the same key.

```rix
t := [0]
t.key = "temperature"
t.__units = "C"
t._spec = "sensor formula"
t ~= 21
## t.key stays "temperature"
## t.__units stays "C"
## t._spec is cleared (rhs had none)
```

**`::=` and `~~=`** are deep-copy variants of `:=` and `~=`, respectively. They recursively copy nested collections instead of sharing inner references.

**Combo operators** (`+=`, `-=`, `*=`, `/=`, `^=`, etc.) use `~=` semantics — they update the value in place, so aliases see the change and meta is preserved:

```rix
x := 5
y = x
x += 1       ## desugars to x ~= x + 1
## both x and y are 6
```

#### Cell Protections and Value Mutability

RiX distinguishes two separate concepts:

1. **Cell-level protection** (ordinary meta — survives `~=`, governs whole-value *replacement*):
   - `.lock` — blocks `~=`, `~~=`, and combo operators; allows `=` rebind, `:=` copy, and in-place index mutation.
   - `.frozen` — blocks `~=`/`~~=` *and* ordinary meta edits; allows `=` rebind and in-place index mutation.
   - `.immutable` — like `.frozen` but permanent; cannot be unset.

2. **Value-level mutability** (ephemeral meta — replaced wholesale under `~=`, governs in-place *structural mutation*):
   - `._mutable` — when truthy, composite values (arrays, maps, tensors) allow index assignment (`arr[i] = v`). Arrays, maps, and tensors default to `._mutable = 1`.

These are intentionally independent: a locked cell may still hold a mutable array whose elements can be changed; and a `~=` to a non-mutable rhs drops the `._mutable` flag from the lhs.

```rix
x := [1, 2, 3]
x.lock = 1       ## lock the cell

x ~= [4, 5, 6]  ## ERROR: cell is locked
x[1] = 9        ## OK: ._mutable governs index mutation, not .lock
```

```rix
a := [1, 2]
a._mutable = _   ## remove value mutability

b := [3, 4]      ## b is mutable (._mutable = 1 by default)
a ~= b           ## a now has b's value AND b's ._mutable
a[1] = 9         ## now OK — ._mutable was adopted from b
```

Use `.DeepMutable(value, flag)` to recursively set or clear `._mutable` throughout a nested structure. Pass `_` (null) to remove mutability, or any non-null value (e.g. `1`) to restore it:

```rix
nested := [[1, 2], [3, 4]]
.DeepMutable(nested, _)   ## all inner arrays lose ._mutable
.DeepMutable(nested, 1)   ## all inner arrays regain ._mutable
```

To define a function, you use the `->` operator. You can either use a named function definition or assign an anonymous lambda to a variable:
```rix
Square(n) -> n ^ 2
Cube := (n) -> n ^ 3
```

#### Rest Parameters and Spread Syntax
RiX supports the spread operator (`...`) to gather leftover parameters into an array (rest parameters) or expand collections into arguments (spread arguments).

```rix
## Rest Parameters
SumAll := (...args) -> (args |>: @+[2] )
SumAll(1, 2, 3)     ## -> 6

## Spread Arguments
arr = [1, 2, 3]
SumAll(...arr, 4)   ## -> 10

## Array Spread
extended = [0, ...arr, 4]  ## -> [0, 1, 2, 3, 4]
```

#### Lexical Scoping and the `@` Prefix
RiX uses lexical scoping. Function bodies, explicit blocks, loops, and system blocks create a new local scope. Inside one of those scopes, plain names resolve only within the current local scope unless you explicitly use `@` to reach outward.

Direct function calls are the one exception: `F(...)` searches outward for a callable binding, so an outer function can be called from inside a scoped block without importing it first. Bare retrieval is still lexical, so `G = F` inside a block is local-only and requires `G = @F` if `F` lives outside the block.

Break blocks (`{! ... }`) and case blocks (`{? ... }`) are a special case. Inside a break block, plain reads can see the **immediate surrounding scope** without `@`, but writes still stay local unless you explicitly use `@name = ...` or `@name += ...` to mutate that surrounding scope.

When the *entire* body of a function or lambda is itself a block, loop, or system container, that outermost container shares the function's scope instead of creating an extra nested one. This lets parameter bindings work naturally:

```rix
Double := (x) -> {; 2 * x }
```

Nested blocks inside that body are still isolated:

```rix
Adjust := (x) -> {;
    x += 1
    {; 2 * @x }   ## nested block must use @x
}
```

If you want to explicitly modify or read a variable from an **outer scope**, you must prefix it with `@`. This prevents accidental shadowing of variables when inside a lambda, block, or loop.

```rix
counter := 0

Increment() -> {;
    @counter += 1   ## Modifies 'counter' from the outer scope
}
```
*Note: Combo assignment operators (`+=`, `*=`, `/=`, etc.) work natively and automatically desugar to the appropriate underlying operation.*

```rix
x := 5
{;
    x         ## Error: x is outside the block scope
    @x + 1    ## OK
}
```

#### Block Import Headers
Scoped execution blocks can optionally start with an import header. This is only valid at the top of an explicit scoped block: plain `{ ... }`, `{; ... }`, `{@ ... }`, and `{$ ... }`.

```rix
{;
    < a~x, b=y, z=, r >
    ...block body...
}
```

The left side introduces a new local name for the block. The right side names the source in the enclosing scope chain.

- `name` and `name~` mean copy `name` from the outer scope into a new local `name`
- `local~outer` copies the current outer value of `outer` into a new local `local`
- `name=` aliases local `name` to the outer binding `name`
- `local=outer` aliases local `local` to the outer binding `outer`

Copy imports stay local:

```rix
x = 10
{;
    < x >
    x = x + 1
}
## outer x is still 10
```

Alias imports write through when you use `~=` or combo operators (which preserve cell identity):

```rix
y := 20
{;
    < y=>
    y += 1       ## combo ops use ~= semantics — writes through the alias
}
## outer y is now 21
```

Note: using plain `=` inside an aliased import rebinds the local name and breaks the alias.  Use `~=` or combo operators like `+=` to write through.

`@name` still bypasses the local import and reaches outward directly:

```rix
x = 5
{;
    < x >
    x = x + 1
    @x = @x + 100
}
## local x is 6, outer x is 105
```

Import headers are declarative, not sequential. In `< a~x, b~a >`, the source for `b~a` is the enclosing `a`, not the newly introduced local `a`. Reusing the same local target twice in one header is an error.

#### Script Imports
RiX can run another `.rix` file with an angle-call expression:

```rix
<"math/square">
<"math/square" x>
<"worker" state=data>
<"poly" x ; p=result, d=deriv>
<"net/fetch" /-All,+Core,+Net/ >
```

The path is resolved relative to the current script (or the current execution base directory at the top level), and `.rix` is added automatically.

- `<"path">` runs the target script.
- Inputs after the path bind caller cells or copied values into a fresh script scope.
- `; outputs` copies or aliases named exports back into the caller scope.
- Every run is fresh. Re-running the same script creates a new execution state each time.
- Imported scripts run with a restricted system capability set. Nested imports are allowed by default unless the `Imports` capability is removed.

If the imported script ends with an explicit export declaration, the script call returns an export bundle instead of the last expression value.

Script:

```rix
< x >
r := x * x
< result=r >
```

Caller:

```rix
y = <"square" x ; z=result>
```


## Null, Holes, Truthiness
RiX simplifies boolean logic with a very consistent rule:
**`null` is the only falsy value.** 
** holes are the undefined and not consider true or false**

Everything else—including `0`, `""` (empty string), and empty collections `[]`—is considered **truthy**. When a short-circuiting operator like `&&` (logical AND) fails to match, it simply returns `null`. This logic makes it very easy to chain conditional checks without needing strict boolean casting.


### Holes and Undefined

RiX has an explicit **hole** value distinct from `null`. Holes arise from two sources:
1. **Omitted syntax** — explicit gaps in array or function-call argument lists.
2. **Unbound identifiers at the REPL** — typing a bare name that has not been assigned displays `undefined` instead of an error.

### null vs hole

| | `null` (`_`) | hole |
|---|---|---|
| Literal syntax | `_` | `[1,,3][2]`, `F(,7)` |
| Assignable? | yes | no |
| Falsy? | yes | — |
| Standard ops | accepted | **error** |
| `?|` coalescing | left side kept | right side used |

### Array hole syntax

Consecutive or trailing commas produce holes:

```rix
[1,,3]      ## sequence with hole at position 2
[,1]        ## hole then 1
[1,]        ## 1 then hole
[,]         ## two holes
[,,]        ## three holes
[1,,3][2]   ## → hole
```

### Hole-coalescing operator `?|`

`left ?| right` — returns `left` if it is not a hole, otherwise evaluates and returns `right`.

```rix
a := [1,,3]
a[2] ?| 9      ## → 9  (position 2 is a hole)
a[1] ?| 9      ## → 1  (position 1 is not a hole)
a[2] ?| a[3]   ## → 3  (chains naturally: left-associative)
```

`?|` is lazy — the right side is not evaluated when the left side is not a hole.

### Omitted call arguments

Pass a hole explicitly by omitting a positional argument:

```rix
F(,7)      ## first arg is a hole
F(1,,3)    ## second arg is a hole
F(,)       ## both args are holes
```

### Parameter defaults with `?|`

Parameters can declare a **hole default** using `?|`. The default is used when the caller explicitly passes a hole or when the argument is omitted entirely:

```rix
F := (x ?| 2, a) -> a ^ x
F(, 7)     ## → 49   (hole for x → x defaults to 2, 7^2)
F(3, 7)    ## → 343  (explicit 3, 7^3)
F(0, 7)    ## → 1    (explicit 0, 7^0; holeDefault not triggered)
```

### Holes in pipes

Holes in sequences are passed through to callbacks. Use `?|` inside the callback to handle them:

```rix
[1,,3] |>> (x -> (x ?| 0) + 1)   ## → [2, 1, 4]
```

Standard reduction/arithmetic pipes will **throw** if they encounter a hole:

```rix
[1,,3] |>: @+[2]   ## error: Cannot use undefined/hole value in computation
```

### REPL unbound identifiers

In the interactive REPL, entering a bare unbound identifier displays `undefined` (rather than raising an error). Expressions that *use* an unbound identifier still throw:

```
rix> x
undefined
rix> x + 1
Error: Undefined variable: x
```


---

## Collections & Data Types

RiX has four primary collection kinds:

| Kind | Literal syntax | Description |
|------|----------------|-------------|
| Sequence (array) | `[1, 2, 3]` | Ordered, 1-based indexed |
| String | `"hello"` | Unicode code-point sequence |
| Tuple | `{: a, b, c }` | Fixed-arity positional group |
| Map | `{= a=1, b=2 }` | Key-value, canonicalized string keys |

Arrays, maps, and tensors are **structurally mutable by default** (`._mutable=1`). Other collections are not. This allows in-place index assignment (`arr[1] = 9`). See the cell protection section below for details.

Map keys are canonicalized via `KEYOF`: integers become their decimal string, strings stay as-is, and arbitrary values may supply a `.key` meta property.
###  Map Key Notes
Map keys are always stored as **strings**.

Key resolution (`.KEYOF`) rules:
- String value -> same string key
- Integer value -> canonical integer string (so `1` and `"1"` are the same key)
- Any other value -> must have meta property `.key` (string or integer)

Map literals support two key forms:
- Identifier sugar: `{= a=5 }` (same as key `"a"`)
- Parenthesized key expression: `{= (expr)=value }`

Expression keys must be parenthesized:

```rix
a = {= a=5, (1)=2, ("3")=4, (1+1)=9 }
```

These are equivalent for lookup/set:

```rix
a[1]
a[:1]
a["1"]
```

So after `a = {= (1)=2 }`, all of `a[1]`, `a[:1]`, and `a["1"]` return `2`.

Map literals reject duplicate keys after key canonicalization:

```rix
{= a=1, ("a")=2 }      ## error: duplicate key "a"
{= (1)=1, ("1")=2 }    ## error: duplicate key "1"
```

### `.key` Identity
Values can define `.key` to control how they behave as map keys:

```rix
v.key = "user:42"
```

Rules:
- `.key` must be string or integer
- First assignment sets identity
- Reassigning the same canonical key is allowed (idempotent)
- Reassigning a different key is an error


### Map Keys

Map keys are canonicalized strings:
- Plain identifiers in literals (`a=1`) use the identifier name as key
- Parenthesized expressions (`(1)=2`) use `KEYOF` to canonicalize: integers become `"1"`, `"2"`, etc.
- Strings use their value

```rix
m = {= a=5, (1)=10, ("x")=20 }
m["a"]   ## 5
m[1]     ## 10   (integer 1 → key "1")
m["x"]   ## 20
```

When a map callback receives a key locator `k`, it is a RiX string value consistent with `KEYOF` and `INDEX_GET`.

### Sort

Sort makes sense for arrays but not maps or sets. There is no canonical ordered version for them. 

### Examples — tensors

Tensor literals use an explicit shape header and row-major order:

```rix
m := {:2x3: 1, 2, 3; 4, 5, 6 }
m[2, 3]            ## 6
m[1, ::]           ## tensor view of the first row
m^^                ## transpose view, shape {: 3, 2 }
```

Tensor traversal pipes use the index tuple as the locator:

```rix
{:2x3:} |>> (v, idx) -> idx[1] * 10 + idx[2]
## {:2x3: 11, 12, 13; 21, 22, 23 }
```

This is the preferred fill idiom. Assignment loops are usually unnecessary because tuple pipes already unpack index tuples:

```rix
{:2x3x7:} |>> (v, idx) -> (idx |> SomeFormula)
```


### Tensor Notes

- Tensor indices are 1-based; negative indices count from the end; index `0` is invalid.
- Bracket slices are strict, closed, and directed. `::` is sugar for the full forward slice.
- Tensor `|>>` returns a new dense tensor with the same shape.
- Tensor `|>?` returns a sequence of `{: value, indexTuple }` pairs.

---

## Execution Blocks & Sigils
RiX heavily leverages braces `{...}` for creating various containers, collections, and execution blocks. 

### Plain Braces: Execution Blocks
Plain braces `{ ... }` are **always** interpreted as execution blocks. They execute statements sequentially and return the value of the final statement.

```rix
## Simple block
{ 
  x := 5; 
  y := 10; 
  x + y 
} ## Returns 15
```

### Sigilled Braces
For other types of containers or specialized execution, a "sigil" is used immediately after the opening brace:

| Syntax | Type | Example / Description |
|--------|------|-------------|
| `{; ... }` | **Explicit Block** | Alternative syntax for blocks. Supports an optional top-of-block import header `< ... >`. |
| `{? ... }` | **Case / Branch** | Conditional branching. Example: `{? x > 0 ? "pos"; x < 0 ? "neg"; "zero" }` |
| `{@ ... }` | **Loop** | C-style loop: `{@ init; condition; body; update }`. Loop headers may also carry an optional name and/or max-iteration cap such as `{@name@ ... }`, `{@:100@ ... }`, `{@name:100@ ... }`, `{@::@ ... }`, or `{@name::@ ... }`. Supports an optional top-of-block import header `< ... >`. |
| `{! ... }` | **Break Block** | Terminates the nearest matching block/case/loop and returns a value. Examples: `{! 5 }`, `{!; 5 }`, `{!@ "done" }`, `{!?name! "big" }`. |
| `{$ ... }` | **System** | Mathematical system of equations/assertions. Example: `{$ x :=: 3; y :>: 10 }`. Supports an optional top-of-block import header `< ... >`. |
| `{= ... }` | **Map** | Dictionary / key-value mappings. Example: `{= name="RiX", version=1 }` |
| `{\| ... }` | **Set** | A collection of unique elements. Example: `{\| 1, 2, 3 }` |
| `{: ... }` | **Tuple** | Fixed-length collection. Example: `{: x, y, z }` |

There are also N-ary operation braces for applying operations across arbitrary elements:
- `{+ 1, 2, 3}` -> N-ary Addition (or string concatenation).
- `{* 2, 3, 4}` -> N-ary Multiplication.
- `{&& a, b, c}` -> N-ary Logical AND (short-circuits to `null` on falsy).
- `{|| a, b, c}` -> N-ary Logical OR (short-circuits to the first truthy value or null).
- `{\/ A, B, C}` -> N-ary set union / interval hull.
- `{/\ A, B, C}` -> N-ary set intersection / interval overlap.
- `{++ A, B, C}` -> N-ary concatenation.
- `{<< a, b, c}` -> N-ary minimum (ignores `null` arguments).
- `{>> a, b, c}` -> N-ary maximum (ignores `null` arguments).
- `<>` remains binary-only; no n-ary brace form.
- In brace form, `<<`/`>>` mean min/max (not shift operators).

###  Loop Headers

Loops use a default max of `10000` iterations unless the host runtime changes `defaultLoopMax`.

- `{@ ... }` and `{@name@ ... }` use the default max.
- `{@:100@ ... }` and `{@name:100@ ... }` set an explicit finite cap.
- `{@::@ ... }` and `{@name::@ ... }` disable max checking.

The max check happens **after the loop condition passes and before the next body execution**. A loop with max `100` can therefore complete 100 iterations; it throws only when iteration 101 would start.

### Break Blocks

Break blocks terminate the nearest matching **plain block**, **explicit block**, **case block**, or **loop**, and the break value becomes that construct's final result.

```rix
{;
    x := 1
    {! 5}
    99
}
## returns 5
```

Targeting forms:

- `{! expr }` — nearest breakable construct of any supported kind
- `{!; expr }` — nearest block (`{ ... }` or `{; ... }`)
- `{!@ expr }` — nearest loop
- `{!? expr }` — nearest case block
- `{!name! expr }`, `{!;name! expr }`, `{!@name! expr }`, `{!?name! expr }` — named targeting

Named explicit blocks use the existing sigil-name syntax, for example `{;outer; ... }`.


---

## System Functions & Calls
Essentially everything in RiX is "syntax sugar" that is immediately translated into fundamental **System Functions** after parsing.
- Writing `3 + 4` evaluates the internal `ADD` function.
- Writing `x := 5` evaluates the internal `ASSIGN` function.

These internal dispatch functions are not exposed as bare identifiers. Instead, all system capabilities are accessed through the **system object**.

### The System Object (`.`)

The bare `.` refers to the **system capability object** — a frozen, sandboxable collection of all built-in functions. You can call any system function by prefixing it with a dot:

```rix
.ADD(3, 4)       ## 7
.SIN(.PI())      ## ~0
.RAND_NAME(8)    ## e.g. "xKqTmPaR"
.AND(1, _)       ## null (false)
```

The system object can be inspected, copied, and restricted:

```rix
sys := .            ## copy of the system object
sys2 := . \ {|"PRINT"|}   ## withhold a capability (not yet in syntax; use .Withhold())
```

> [!NOTE]
> The system object is **frozen by default** — you cannot add or change capabilities on it directly. Use `.Withhold("NAME")` or `.With("NAME", fn)` to create a restricted or extended copy for passing to loaded scripts.

### Calling System Functions via `@_` Syntax

You can also invoke a system capability using the `@_Name()` form, which is an exact equivalent to `.Name()`:

```rix
@_ADD(3, 4)    ## same as .ADD(3, 4) → 7
@_ASSIGN(x, 5) ## same as .ASSIGN(x, 5) → sets x
```

### Aliasing Operator Functions

If you want to retrieve an operator's underlying function (e.g., to pass to a pipe or partial application), prefix its symbol with `@`. This returns a reference to the system capability for that operator:

```rix
adder := @+       ## reference to .ADD
adder(10, 20)     ## 30

## Equivalent forms:
ref := .ADD       ## also a reference to .ADD
ref(10, 20)       ## 30
```

The mapping from operator symbol to system name:

| Operator | System Capability |
|----------|------------------|
| `@+`     | `.ADD`           |
| `@-`     | `.SUB`           |
| `@*`     | `.MUL`           |
| `@/`     | `.DIV`           |
| `@//`    | `.INTDIV`        |
| `@%`     | `.MOD`           |
| `@^`     | `.POW`           |
| `@==`    | `.EQ`            |
| `@<`     | `.LT`            |
| `@>`     | `.GT`            |
| `@&&`    | `.AND`           |
| `@\|\|`  | `.OR`            |
| `@!`     | `.NOT`           |

### Partial Application and Placeholders
RiX supports powerful partial application using placeholders `_1`, `_2`, etc. When you call a function and use one or more of these placeholders instead of a value, it returns a **Partial Function**.

```rix
Double := @*(_1, 2)
Double(5) ## Returns 10

## Reordering arguments
SwapSubtract := @-(_2, _1)
SwapSubtract(10, 30) ## Returns 20 (30 - 10)

## Duplicating arguments
Square := @*(_1, _1)
Square(4) ## Returns 16
```

Partial functions are especially useful in pipelines:
```rix
[1, 2, 3] |>> @+(_1, 10) ## [11, 12, 13]
```


### Arity-Capped Callable Views

The syntax `fn[n]` produces a **callable wrapper** that forwards only the first `n` arguments to `fn` and silently discards any extras.

```rix
fn[n]
```

This is useful when a pipe callback supplies extra context arguments (locator, source) that a bare system function would misinterpret.

**This is not partial application.** It does not bind arguments, reorder them, or select arbitrary positions — it simply truncates the incoming argument list to the first `n`.

### Examples

```rix
## Reduce with bare @+ — without arity cap, @+ would receive (acc, val, locator, src)
## and MUL would try to use the sequence object in arithmetic.
[1, 2, 3] |>: @+[2]        ## 6   (only acc and val forwarded to @+)
[1, 2, 3] |:> 0 >: @+[2]   ## 6

## Map and filter with a user function
double := (x) -> x * 2
[1, 2, 3] |>> double[1]     ## [2, 4, 6]   (locator dropped)

isEven := (x) -> x % 2 == 0
[1, 2, 3, 4] |>? isEven[1]  ## [2, 4]

## Works on maps too
{= a=2, b=3 } |>> double[1]   ## {= a=4, b=6 }

## General call context (not pipe-specific)
G := @+[2]
G(10, 20, 99, 99)   ## 30  (only 10 and 20 forwarded)

## Zero-arity cap
C := () -> 42
C[0](1, 2, 3)       ## 42  (no args forwarded)

## Nested caps — outer cap wins
@+[3][2](1, 2, 3, 4)   ## 3  (at most 2 args reach @+)
```

### Relationship to placeholders

| Approach | Syntax | Purpose |
|---|---|---|
| Arity cap | `fn[n]` | Forward only first `n` args |
| Placeholder | `@+(_1, _2)` | Explicit selection / reordering |

Use `fn[n]` when you want "first N args only"; use placeholders when you need anything more specific.

### Rules

- `n` must be a non-negative integer literal. Negative or non-integer values error.
- If fewer than `n` arguments are supplied at call time, all are forwarded (no padding).
- Works on any callable value: lambdas, named functions (uppercase), system references, partials, or already-capped callables.
- Does not affect ordinary collection indexing — `collection[i]` continues to index as before.


---

##  Pipe Operators `|>`

RiX is highly optimized for functional programming and data transformation. The pipe operators allow you to cleanly string operations together. It's crucial to note that **pipe operators always return new collections**; they never mutate the original in-place. 

**Mutability Note:** While pipe operators create new copies, arrays and maps are created as **structurally mutable** by default (`._mutable=1`). This allows you to perform in-place modification using indices (e.g., `arr[1] = val`). You can disable structural mutation by removing the value mutability flag (`arr._mutable = _`). Cell-level protections (`.lock`, `.frozen`, `.immutable`) govern whole-value replacement, not index assignment.

When piping strings, RiX natively treats them as sequences of **Unicode Code Points**, safely keeping emojis and surrogate pairs intact across all slice, map, and filter operations.


Pipes pass values through transformations. All collection-pipe operators return **new** collections and never mutate the source.

### Plain pipe

```rix
val |> fn        ## pipe val as first arg to fn
val ||> fn(_1)   ## explicit placeholder form
```

### Collection traversal pipes

The following pipes traverse elements of a collection and invoke a callback on each. They support sequences, strings, and (for the traversal/fold operators) maps.

```rix
coll |>> fn      ## PMAP:    map fn over elements
coll |>? pred    ## PFILTER: keep elements where pred passes
coll |>&& pred   ## PALL:    every element passes (short-circuits)
coll |>|| pred   ## PANY:    any element passes (short-circuits)
coll |>: fn      ## PREDUCE: fold, first element/value as init
coll |:> init >: fn   ## PREDUCE: fold with explicit initial value
coll |>/| sep    ## PSPLIT:  split by delimiter, regex, or predicate
coll |>#| n      ## PCHUNK:  chunk by size or predicate boundary
coll |>< fn      ## Not a pipe; |>< is PREVERSE (reverse)
coll |<> fn      ## PSORT:   sort with comparator
```

### Callback contract

For **traversal pipes** (`|>>`, `|>?`, `|>&&`, `|>||`, predicate form of `|>/|`, predicate form of `|>#|`):

```
callback(val, locator, src)
```

For **reduce** (`|>:` and `|:> init >: fn`):

```
callback(acc, val, locator, src)
```

For **sort** (`|<>`), the comparator receives only:

```
comparator(a, b)
```

**Locator** is the native indexing/key form for the source collection kind:
- **Sequences and strings**: 1-based integer position (position 1 is the first element)
- **Maps**: the canonical map key as a RiX string
- **Tensors**: a 1-based index tuple

Callbacks that declare fewer parameters simply ignore the extra arguments.

### Examples — sequences

```rix
## Map with value only (backward-compatible)
[1, 2, 3] |>> (x) -> x * x         ## [1, 4, 9]

## Map with value + locator
[10, 20, 30] |>> (v, k) -> k        ## [1, 2, 3]  (1-based positions)

## Map using all three args (value, locator, source)
[10, 20, 30] |>> (v, k, s) -> {: v, k, .LEN(s) }
## [{: 10, 1, 3 }, {: 20, 2, 3 }, {: 30, 3, 3 }]

## Filter by locator (keep even-indexed elements)
[10, 20, 30, 40] |>? (v, k) -> k % 2 == 0    ## [20, 40]

## Reduce summing locators (1+2+3)
[10, 20, 30] |:> 0 >: (acc, v, k) -> acc + k  ## 6

## Reduce — implicit init (first element is accumulator)
[1, 2, 3, 4] |>: (acc, v) -> acc + v           ## 10
```

### Examples — strings

Strings are traversed as Unicode code points. The locator is the 1-based code-point position.

```rix
"abc" |>> (ch, k) -> k        ## [1, 2, 3]  (code-point positions)
"😀a😃" |>> (ch) -> ch        ## "😀a😃"  (identity map returns string)
"aAbBc" |>? (ch) -> ch != "A" ## "aBbc"  (filter on char value)
```

### Examples — maps

Maps support `|>>`, `|>?`, `|>&&`, `|>||`, `|>:`, and `|:> init >: fn`. Maps are **unordered** — no iteration-order guarantee is exposed to users.

For map traversal, callbacks receive `(value, key, sourceMap)`. The key is the canonical map key string.

`|>>` on a map **preserves original keys and transforms only values**. For structural reshaping, use reduce.

```rix
m = {= a=2, b=3 }

## Map values (preserve keys)
m |>> (v, k) -> v * 10          ## {= a=20, b=30 }

## Map — callback can use the key
m |>> (v, k) -> k ++ "=" ++ v   ## {= a="a=2", b="b=3" }

## Filter by value
{= a=2, b=7, c=1 } |>? (v, k) -> v > 1    ## {= a=2, b=7 }

## Filter by key
{= a=2, b=7, c=1 } |>? (v, k) -> k == "b" ## {= b=7 }

## All values positive?
{= a=2, b=7 } |>&& (v) -> v > 0   ## 7  (last value; null if any fail)

## Any value > 5?
{= a=2, b=7 } |>|| (v) -> v > 5   ## 7  (first passing value)

## Explicit-init reduce over values
{= a=2, b=7 } |:> 0 >: (acc, v) -> acc + v  ## 9

## Implicit-init reduce (first value encountered is accumulator; order unspecified)
{= a=2, b=7 } |>: (acc, v) -> acc + v       ## 9  (result, order unspecified)
```

Maps do **not** support `|>/|` (split), `|>#|` (chunk), or `|<>` (sort).

RiX has two distinct reduce forms with intentionally different semantics:

| Form | Syntax | Init source |
|------|--------|-------------|
| Implicit init | `coll \|>: fn` | First element/value of `coll` |
| Explicit init | `coll \|:> init >: fn` | `init` expression |

Both forms pass `(acc, val, locator, src)` to the callback.

### Backward compatibility with partial functions

Existing partial callbacks continue to work. When a partial is invoked via a traversal pipe, it receives only as many arguments as needed to satisfy its placeholders. Extra locator/src arguments are not forwarded to partials to avoid unintended behavior with N-ary system functions.

```rix
## These all work as before
[1, 2, 3] |>> @*(_1, 10)           ## [10, 20, 30]
[1, 2, 3] |>: @+(_1, _2)           ## 6
[1, 2, 3] |>? @>(_1, 0)            ## [1, 2, 3]
```

To access the locator or source in a partial, use explicit placeholder positions:

```rix
## _1 = val, _2 = locator, _3 = src
[10, 20, 30] |>> @+(_1, _2)   ## [11, 22, 33]  (value + 1-based position)
```



The sort comparator receives `(a, b)` only — no locator or source. Sort does not support maps.

```rix
[3, 1, 2] |<> (a, b) -> a - b   ## [1, 2, 3]  ascending
```

---

### Sequences, Generators, and Laziness
RiX features incredibly dense and powerful list-generation syntax using the pipe `|` inside brackets `[...]`. You generate sequences by specifying an initial state, a generation rule (such as adding or multiplying), and a stop condition.

**Common Generation Rules:**
- `\|+n`: Add `n` to the previous element (arithmetic progression).
- `\|*n`: Multiply the previous element by `n` (geometric progression).
- `\|:f`: Generate by index, mapping function `f(index)`.
- `\|>f`: Recursively pipe the previous values into function `f`.

**Example Generators:**
```rix
[2, |+2, |; 5]           ## Eager Arithmetic: [2, 4, 6, 8, 10]
[1, |*3, |; 4]           ## Eager Geometric: [1, 3, 9, 27]
[|: (i) -> i^2, |; 5]    ## Eager Mapping (Index squares): [0, 1, 4, 9, 16]
[1, 1, |>(a,b) -> a+b, |; 7]  ## Eager Recursive: Fibonacci sequence!
```

### target Stopping vs Laziness
The stop condition specifies both *when* to stop and *how* to evaluate:
- **Eager (`|;`)**: Computes all values immediately.
    - `|; 5`: Make exactly `5` elements.
    - `|; (x) -> x > 10`: Make items until an item strictly exceeds 10.
- **Lazy (`|^`)**: Returns a lazy iterator/generator instead of an array! The values will only be computed when functionally requested.
    - `|^ 1000`: Lazily bounds the generator to 1000 elements max.
    - `|^ (x) -> x > 1000`: Lazily stops when the predicate hits.


---

## Number Systems and Notation
RiX is built on an exact rational arithmetic core, and as such it supports multiple expressive ways to input and represent numbers perfectly accurately without floating point failure.

### Repeating Decimals (`#`)
The `#` character separates the non-repeating fractional digits from the infinitely repeating digits:
- `0.12#45` evaluates exactly to $0.12\overline{45}$.
- `0.#3` evaluates to $0.\overline{3} = 1/3$ (no non-repeating fractional part).
- `1.#6` evaluates to $1.\overline{6} = 5/3$.
- `7#3` evaluates exactly to $7.\overline{3}$ (= 22/3).

### Radix Shift (`_^`)
`n_^k` multiplies `n` by `10^k`, shifting the decimal point without floating point error:
- `1_^2` is exactly `100`.
- `3.14_^2` is exactly `314`.
- `1_^-2` is exactly `1/100`.

### Continued Fractions (`.~`)

RiX natively parses continued fraction representations as exact rationals.

A continued fraction $[a_0; a_1, a_2, \ldots]$ is written as `a0.~a1~a2~...`. There are two forms:

**Implicit-start** — integer part is unsigned (no leading sign or `~`):
- `3.~7~15~1` evaluates exactly to `355/113`.
- `1.~2` evaluates to `3/2`.

**Explicit-start** — a leading `~` marks the coefficient, and the integer part may be negative:
- `~1.~2` is the same as `1.~2` (= `3/2`).
- `~-1.~2` has first coefficient −1: evaluates to `−1 + 1/2 = −1/2`.
- `~-2.~1~2~2` evaluates to `−9/7`.

To **negate** a continued fraction value, apply unary minus to an explicit-start CF:
- `-~1.~2` = `−(1 + 1/2) = −3/2`.

> **Note:** Writing `-1.~2` (minus directly attached to an implicit-start CF) is a **syntax error** because it is ambiguous — it could mean a negative first coefficient or a negated value. Use `~-1.~2` or `-~1.~2` as appropriate.

### Mixed Numbers
Mixed numbers are supported using a double period `..` to attach an integer to a fraction seamlessly (with no internal spaces):
- `1..3/4` parses exactly as $1 + 3/4 = 7/4$.
- `-2..1/2` parses exactly as $-5/2$.

### Intervals and Betweenness

RiX treats intervals as first-class objects using the colon `:` operator. An interval represents the range of values between two endpoints.
- `1:5` creates a **RationalInterval** from 1 to 5.
- `5:2` creates an interval from 5 down to 2. RiX preserves the input order for display, but mathematically they cover the same range.

#### Betweenness
When three or more values are chained with colons, RiX automatically switches from interval creation to a **betweenness check**. It evaluates whether the values are in monotonic (ascending or descending) order.
- `2:3:5` returns `1` (true) because 3 is between 2 and 5.
- `2:6:5` returns `null` because 6 is not between 2 and 5.

This n-ary betweenness works for arbitrary chain lengths (e.g., `1:2:3:4:5`) and even supports **nested containers**:
- `2:(3:4):5` checks if the interval `3:4` is entirely contained within `2:5`.
- `2:{|3, 4, 4.5|}:5` checks if every element in the set is between 2 and 5.

### Bases
Input numbers are in base 10 unless they have a leading `0` followed by a letter. There are some bases that are named by default, such as `0b` for binary. Capital letters are available for user defined bases. 

Defined default bases are:
- `b` for binary (Base 2)
- `t` for ternary (Base 3)
- `q` for quaternary (Base 4)
- `f` for Base 5
- `s` for Base 7
- `d` for Base 12 (duodecimal)
- `x` for hexadecimal (Base 16)
- `v` for Base 20 (vigesimal)
- `u` for Base 36 (url shorteners)
- `m` for Base 60 (mesopotamia)
- `y` for Base 64 (0-9A-Za-z@&)

`0z[23]13FASD3` indicates a custom base of 23 which goes from 0 to 9 and then A-M. Base 64 is as high as the default goes; above that one must define a custom set of symbols, presumably going into unicode territory.

You can also define custom uppercase base prefixes directly:
- `0A = "0123456789ABCDEF"`
- `0B = {: 2, "01" }`

Base conversion operators:
- `n _> baseSpec` formats a number to a base string.
- `str <_ baseSpec` parses a base string back into an exact number.

Examples:
- `74 _> 0A` gives `"4A"`.
- `"4A.F" <_ 0A` gives `74 + 15/16`.

Prefixed literals also support quoted digit streams:
- `0A4A.F`
- `0A"4A.F"`


---

## Set and Collection Algebra
RiX provides a concise symbolic algebra for sets, intervals, and collections:

- `A \/ B`: Union (sets) or Hull (intervals).
- `A /\ B`: Intersection (sets) or Overlap (intervals).
- `A \ B`: Set difference (or key removal from maps).
- `A <> B`: Symmetric difference.
- `x ? S`: Membership test for sets/intervals; for maps, key existence test using `.KEYOF(x)`.
- `x !? S`: Non-membership test (for maps: key does not exist).
- `A ?& B`: Intersects predicate.
- `A ** B`: Cartesian product of sets.
- `A ++ B`: Concatenation of ordered collections (arrays, tuples, strings, maps).

## Symbolic System Specs

RiX now uses `{# ... }` for symbolic system specs.

```rix
S = {#x,y,z:p#
  p = x^2 * y + z
}
```

This form does not execute its body as a runtime block. Instead it returns a first-class symbolic spec object with:

- `kind = "systemSpec"`
- `inputs`
- `outputs`
- `statements`

Header forms:

```rix
{# ... }
{#x,y,z# ... }
{#:p,q# ... }
{#x,y,z:p,q# ... }
```

Rules for the header:

- Names before `:` are declared inputs.
- Names after `:` are declared outputs.
- Header names must be bare identifiers.
- Duplicate input names, duplicate output names, and input/output overlap are rejected.

Rules for the body in the current implementation:

- Only symbolic assignment statements are supported: `name = expr`
- The left-hand side must be a bare identifier.
- `=` inside `{# ... }` means symbolic definition inside the spec, not runtime assignment and not solver equality.
- If outputs are declared, each declared output must be assigned exactly once.
- If outputs are omitted, outputs are inferred from top-level assignment targets in encounter order.

Expression trees are stored structurally, not as precomputed values and not as reparsed source strings. Outer references such as `@name` are preserved symbolically for later consumers to interpret.

Current host-side helpers used in tests:

```rix
P = {#x,y,z:p# p = x^2 * y + z } |> Poly
Dx = Deriv({#x,y,z:p# p = x^2 * y + z }, "x")
```

`Poly` and `Deriv` currently support a restricted polynomial subset:

- constants
- identifiers
- `+`
- `-`
- `*`
- `^` with a nonnegative integer literal exponent

Relation and constraint forms such as `:=:`, `:<:`, and `:>:` remain separate and are reserved for later relational/solver work.


---

## Regex Literals
RiX provides first-class support for Regular Expressions using the `{/pattern/flags?mode}` syntax. A regex literal evaluates to a function that you can then call with a string to perform matching.

### Syntax and Modes
The character following the trailing slash determines the evaluation **mode**:

| Mode | Syntax | Returns |
|------|--------|---------|
| **ONE** | `{/pat/}` | The first Match object found, or `null`. |
| **TEST** | `{/pat/?}` | `1` if a match exists, otherwise `null`. |
| **ALL** | `{/pat/*}` | A sequence of all Match objects found. |
| **ITER** | `{/pat/:}` | A stateful iterator function for sequential or indexed access. |

### Match Objects
When a regex matches, it returns a **Map** containing:
- `text`: The full text of the match.
- `span`: A tuple `{: start, end }` (1-based indices).
- `groups`: A sequence of all capture groups.
- `spans`: A sequence of tuples for each capture group's span.
- `named`: A map of named capture groups.
- `named spans`: A map of spans for named capture groups.
- `input`: The original input string.

### Examples
```rix
## Simple check
IsEmail := {/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/?}
IsEmail("test@example.com") ## Returns 1

## Iterator usage
Scanner := {/\d+/:}
it := Scanner("12 apples, 45 oranges")
it() ## Returns match object for "12"
it() ## Returns match object for "45"
it(1) ## Random access: returns "12" again
```

---

## 10. Units (Scientific and Algebraic)

> [!WARNING]
> Units syntax is reserved in the tokenizer but the underlying evaluation and conversion systems have **yet to be fully implemented**.

RiX is designed to treat both scientific and mathematical units as first-class citizens, preventing physical dimensional errors and keeping algebraic markers exact.

Units are attached to numbers using a tilde `~` separator:
- **Scientific Units** use brackets `~[...]`. Example: `9.8~[m/s^2]` or `3.2~[kg]`.
- **Algebraic / Math Units** use braces `~{...}`. Example: `2~{i}` (imaginary unit) or `1~{sqrt2}`.

Double tildes `~~` are reserved as a conversion operator, for example, to convert a value to a different unit type.

---

---

## 11. Other Notable Features
### Division Variants
Because RiX operates internally on rich math types, division is highly granular:
- `/` performs rational (fractional) division.
- `//` performs integer (floor) division.
- `/%` performs division returning the remainder.
- `/~` performs rounded division.
- `/^` performs ceiling division.

### Ternary Operators
RiX replaces the traditional `C` style ternary (`cond ? true : false`) with its own null-coalscing style syntax using `??` and `?:`.
```rix
result := (score > 50) ?? "Pass" ?: "Fail"
```

### Assertions
When validating equations or tests, you have special assertion operators:
- `:=:` Asserts equality (or acts as a solver check)
- `:<:` Asserts less than
- `:>:` Asserts greater than
- `:<=:` / `:>=:` Asserts boundaries.


### Utility System Function
`.RAND_NAME(len=10, alphabet="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")` returns a random string. Like all system capabilities, it is called via the dot prefix.

Examples:
```rix
.RAND_NAME()
.RAND_NAME(5)
.RAND_NAME(12, "abc")
```
