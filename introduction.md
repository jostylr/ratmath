# Introduction to RiX

Welcome to RiX! RiX is the expressive scripting language designed for the RatMath arithmetic environment. Its syntax is built to be concise, functional, and deeply oriented around mathematical investigation. 

This guide introduces the core features and idiosyncrasies of RiX to get you comfortable with the language quickly.

---

## 1. Identifiers: Capital vs Lowercase

In RiX, the casing of the very first letter of an identifier carries semantic weight:

- **Variables** should start with a lowercase letter (e.g., `x`, `myVar`, `my_var`). **camelCase** or **snake_case** are recommended.
- **User-defined functions** start with an uppercase letter (e.g., `Square`, `MyFn`).
- **System capabilities** (built-in functions like `ADD`, `RAND_NAME`, `SIN`) are **not** accessible as bare identifiers. They must be called via the **system object** using the dot prefix: `.ADD(3, 4)`, `.SIN(x)`, `.RAND_NAME()`.

> [!NOTE]
> Standalone `_` is the **null operator** (same as `NULL()`). However, `_` is allowed within identifiers as long as it's not the only character.

> [!NOTE]
> Case normalization: only the first letter's case is significant. Beyond the first letter, identifiers are case-insensitive — so `myVar`, `myvar`, and `myVAR` all refer to the same variable. Similarly, `Square` and `SQUARE` are the same user function.

---

## 2. Setting Up Variables and Scopes

### Assignment
Assignment is straightforward, using `:=` or `=`.
```rix
x := 5
y = 10
```

To define a function, you use the `->` operator. You can either use a named function definition or assign an anonymous lambda to a variable:
```rix
Square(n) -> n ^ 2
Cube := (n) -> n ^ 3
```

### Lexical Scoping and the `@` Prefix
RiX uses lexical scoping. Function bodies, explicit blocks, loops, and system blocks create a new local scope. Inside one of those scopes, plain names resolve only within the current local scope unless you explicitly use `@` to reach outward.

Direct function calls are the one exception: `F(...)` searches outward for a callable binding, so an outer function can be called from inside a scoped block without importing it first. Bare retrieval is still lexical, so `G = F` inside a block is local-only and requires `G = @F` if `F` lives outside the block.

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

Alias imports write through:

```rix
y = 20
{;
    < y=>
    y = y + 1
}
## outer y is now 21
```

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

---

## 3. Truthiness: Everything is Truthy except `null`

RiX simplifies boolean logic with a very consistent rule:
**`null` is the only falsy value.** 

Everything else—including `0`, `""` (empty string), and empty collections `[]`—is considered **truthy**. When a short-circuiting operator like `&&` (logical AND) fails to match, it simply returns `null`. This logic makes it very easy to chain conditional checks without needing strict boolean casting.

---

RiX heavily leverages braces `{...}` for creating various containers, collections, and execution blocks. 

### 4.1 Plain Braces: Execution Blocks
Plain braces `{ ... }` are **always** interpreted as execution blocks. They execute statements sequentially and return the value of the final statement.

```rix
## Simple block
{ 
  x := 5; 
  y := 10; 
  x + y 
} ## Returns 15
```

### 4.2 Sigilled Braces
For other types of containers or specialized execution, a "sigil" is used immediately after the opening brace:

| Syntax | Type | Example / Description |
|--------|------|-------------|
| `{; ... }` | **Explicit Block** | Alternative syntax for blocks. Supports an optional top-of-block import header `< ... >`. |
| `{? ... }` | **Case / Branch** | Conditional branching. Example: `{? x > 0 ? "pos"; x < 0 ? "neg"; "zero" }` |
| `{@ ... }` | **Loop** | C-style loop: `{@ init; condition; body; update }`. Supports an optional top-of-block import header `< ... >`. |
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

### 4.3 Map Key Notes
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

### 4.4 `.key` Identity
Values can define `.key` to control how they behave as map keys:

```rix
v.key = "user:42"
```

Rules:
- `.key` must be string or integer
- First assignment sets identity
- Reassigning the same canonical key is allowed (idempotent)
- Reassigning a different key is an error

---

## 5. System Functions vs Syntax Sugar

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

---

## 5.5 Symbolic Algebra

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

### 5.6 Utility System Function
`.RAND_NAME(len=10, alphabet="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")` returns a random string. Like all system capabilities, it is called via the dot prefix.

Examples:
```rix
.RAND_NAME()
.RAND_NAME(5)
.RAND_NAME(12, "abc")
```

---

## 6. Pipe Operators `|>`

RiX is highly optimized for functional programming and data transformation. The pipe operators allow you to cleanly string operations together. It's crucial to note that **pipe operators always return new collections**; they never mutate the original in-place. 

**Mutability Note:** While pipe operators create new copies, arrays and maps are created as **mutable** by default (`mutable=1`). This allows you to perform in-place modification using indices (e.g., `arr[1] = val`). You can lock a collection by removing its mutable flag (`arr.mutable = _`).

When piping strings, RiX natively treats them as sequences of **Unicode Code Points**, safely keeping emojis and surrogate pairs intact across all slice, map, and filter operations.

- `val |> fn`: Pipe `val` as the first argument to `fn`.
- `coll |>/ i:j`: Strict slice of a collection. Both `i` and `j` must be integers exactly within the bounds. Negative indices index from the end. Returns `null` if bounds are invalid.
- `coll |>// i:j`: Clamped slice of a collection. Clamps out-of-bounds indices to the collection's boundaries. Returns an empty collection instead of `null`. Directed intervals reverse standard operations.
- `coll |>/| sep`: Split (`PSPLIT`) the collection or string by a delimiter string, a `REGEX` or a predicate function. The function form starts a SEP with true and ends with false. Separators are not included. 
- `coll |>#| nOrFn`: Chunk (`PCHUNK`) the collection into subarrays/substrings of an integer size `n` or split when a predicate boundary matches.
- `coll |>> fn`: Map (`PMAP`) `fn` over each element in the collection.
- `coll |>? pred`: Filter (`PFILTER`) the collection using the predicate `pred`.
- `coll |>: fn`: Reduce (`PREDUCE`) the collection using `fn` signature `acc, val`.
- `coll |:> val : fn`: Reduce (`PREDUCE`) the collection using `fn` with initial value `val`.
- `coll |><`: Reverse (`PREVERSE`) the collection.
- `coll |<> fn`: Sort (`PSORT`) the collection using the comparator `fn`.
- `coll |>&& pred`: Check if all elements pass the predicate. Returns the last item if all pass, `null` otherwise.
- `coll |>|| pred`: Check if any element passes the predicate. Returns the first passing item, `null` otherwise.

**Example Pipeline:**
```rix
[1, 2, 3, 4, 5] 
  |>? (x) -> x % 2 == 0   ## Keeps even numbers: [2, 4]
  |>> (x) -> x ^ 2        ## Squares them: [4, 16]
  |>: @+                  ## Sums them: 20
```

---

## 7. Sequences, Generators, and Laziness

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

## 8. Number Systems and Notation

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

## 9. Units (Scientific and Algebraic)

> [!WARNING]
> Units syntax is reserved in the tokenizer but the underlying evaluation and conversion systems have **yet to be fully implemented**.

RiX is designed to treat both scientific and mathematical units as first-class citizens, preventing physical dimensional errors and keeping algebraic markers exact.

Units are attached to numbers using a tilde `~` separator:
- **Scientific Units** use brackets `~[...]`. Example: `9.8~[m/s^2]` or `3.2~[kg]`.
- **Algebraic / Math Units** use braces `~{...}`. Example: `2~{i}` (imaginary unit) or `1~{sqrt2}`.

Double tildes `~~` are reserved as a conversion operator, for example, to convert a value to a different unit type.

---

## 10. Other Notable Features

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

---

## 11. Regex Literals

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
