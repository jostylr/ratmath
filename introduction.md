# Introduction to RiX

Welcome to RiX! RiX is the expressive scripting language designed for the RatMath arithmetic environment. Its syntax is built to be concise, functional, and deeply oriented around mathematical investigation. 

This guide introduces the core features and idiosyncrasies of RiX to get you comfortable with the language quickly.

---

## 1. Identifiers: Capital vs Lowercase

In RiX, the casing of the very first letter of an identifier carries semantic weight:

- **Variables** should start with a lowercase letter (e.g., `x`, `myVar`). **CamelCase** is the recommended naming convention.
- **System Functions** (the built-in functions) are always fully **Uppercase** or start with an uppercase letter (e.g., `ADD`, `SIN`, `MAP`).

> [!WARNING]
> Do not use `snake_case` (like `my_var`). In RiX, the underscore `_` is a distinct operator that acts as a placeholder or returns `null`. Therefore, `my_var` is parsed identically to `my * _ * var` (multiplication with a null in the middle)!

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
RiX uses lexical scoping. By default, when you assign to a variable inside a block or a function, it creates or updates a *local* variable in the innermost scope. 

If you want to explicitly modify or read a variable from an **outer scope**, you must prefix it with `@`. This prevents accidental shadowing of variables when inside a lambda or loop.

```rix
counter := 0

Increment() -> {;
    @counter += 1   ## Modifies 'counter' from the outer scope
}
```
*Note: Combo assignment operators (`+=`, `*=`, `/=`, etc.) work natively and automatically desugar to the appropriate underlying operation.*

---

## 3. Truthiness: Everything is Truthy except `null`

RiX simplifies boolean logic with a very consistent rule:
**`null` is the only falsy value.** 

Everything else—including `0`, `""` (empty string), and empty collections `[]`—is considered **truthy**. When a short-circuiting operator like `AND` (`&&`) fails to match, it simply returns `null`. This logic makes it very easy to chain conditional checks without needing strict boolean casting.

---

## 4. The Braces Syntax

RiX heavily leverages braces `{...}` for creating various containers, collections, and execution blocks. The very first character or operator inside the opening brace dictates what type of container it is:

| Syntax | Type | Example / Description |
|--------|------|-------------|
| `{; ... }` | **Block** | Sequential execution. Returns the value of the last statement. Example: `{; a := 1; b := 2; a + b }` |
| `{? ... }` | **Case / Branch** | Conditional branching (if/elseif/else). Example: `{? x > 0 ? "pos"; x < 0 ? "neg"; "zero" }` |
| `{@ ... }` | **Loop** | C-style loop mapping to `{@ init; condition; body; update }`. |
| `{= ... }` | **Map** | Dictionary / key-value mappings. Example: `{= name="RiX", version=1 }` |
| `{\| ... }` | **Set** | A collection of unique elements. Example: `{\| 1, 2, 3 }` |
| `{: ... }` | **Tuple** | Fixed-length collection. Example: `{: x, y, z }` |

There are also N-ary operation braces for applying operations across arbitrary elements:
- `{+ 1, 2, 3}` -> N-ary Addition (or string concatenation).
- `{* 2, 3, 4}` -> N-ary Multiplication.
- `{&& a, b, c}` -> N-ary Logical AND (short-circuits to `null` on falsy).
- `{|| a, b, c}` -> N-ary Logical OR (short-circuits to the first truthy value or null if no truthy values are found).

---

## 5. System Functions vs Syntax Sugar

Essentially everything in RiX is "syntax sugar" that is immediately translated into fundamental **System Functions** after parsing. 
- Writing `3 + 4` actually evaluates `ADD(3, 4)`.
- Writing `x := 5` evaluates `ASSIGN(x, 5)`.

One can use a named system function using `@_ADD(3, 4)` or `@_ASSIGN(x, 5)`.

### Aliasing System Functions
If you ever want to retrieve the underlying system function itself (for example, to pass it as a callback to a map or reduce function), you can retrieve it by prefixing its operator with `@`:

```rix
adder := @+
adder(10, 20) ## Retrieves `ADD`, then calls it, returning 30
```

---

## 6. Pipe Operators `|>`

RiX is highly optimized for functional programming and data transformation. The pipe operators allow you to cleanly string operations together. It's crucial to note that **pipe operators always return new collections**; they never mutate the original in-place.

- `val \|> fn`: Pipe `val` as the first argument to `fn`.
- `coll \|>> fn`: Map (`PMAP`) `fn` over each element in the collection.
- `coll \|>? pred`: Filter (`PFILTER`) the collection using the predicate `pred`.
- `coll \|>: fn`: Reduce (`PREDUCE`) the collection using `fn` signature `acc, val`.
- `coll \|:> val : fn`: Reduce (`PREDUCE`) the collection using `fn` with initial value `val`.
- `coll \|><`: Reverse (`PREVERSE`) the collection.
- `coll \|<> fn`: Sort (`PSORT`) the collection using the comparator `fn`.
- `coll \|>&& pred`: Check if all elements pass the predicate. Returns `1` if they do, `null` otherwise.

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

### Repeating Decimals
You can represent repeating decimals exactly using the `#` character to denote the start of the repeating sequence:
- `0.12#45` evaluates exactly to $0.12\overline{45}$.
- `7#3` evaluates exactly to $7.\overline{3}$ (or `22/3`).

### Continued Fractions
RiX natively parses continued fraction representations. The syntax starts with the integer part, followed by `.~`, and then the sequence of denominators separated by `~`:
- `3.~7~15~1~292` represents the continued fraction for $\pi$ (evaluated exactly as a rational constraint).
- `0.~2~3~4` is an example of a continued fraction with a `0` integer part.
- `5.~0` explicitly enforces a canonical continued fraction for exactly `5`.

### Mixed Numbers
Mixed numbers are supported using a double period `..` to attach an integer to a fraction seamlessly (with no internal spaces):
- `1..3/4` parses exactly as $1 + 3/4 = 7/4$.
- `-2..1/2` parses exactly as $-5/2$.

### Bases
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
