# What Fold does, step by step

Fold repeatedly combines a list into one answer. It remembers the answer so
far and feeds it into the next step.

Consider the polynomial `2*x^2 + 3*x + 4`, evaluated at `x = 5`:

```rix
coefficients := [2, 3, 4];
point := 5;

answer := .exactLoop.Fold(
    coefficients,
    0,
    (acc, coefficient, x) -> acc*x + coefficient,
    [point]
);
```

The four arguments mean:

1. `coefficients`: visit these values in order: 2, then 3, then 4.
2. `0`: start with an answer of zero.
3. `(acc, coefficient, x) -> acc*x + coefficient`: a little function describing
   one step. The arrow creates the function; it does not run it yet. `acc` is the
   answer so far, `coefficient` is the next list item, and `x` is the extra input.
4. `[point]`: supply 5 as the third callback argument on every step. It is a
   one-item list of extra arguments, not another list to loop over. Passing it
   explicitly avoids an implicit read from a surrounding mutable scope.

The parameter names are names you choose; their **positions** determine which
value they receive. Calling them `(total, item, p)` would work just as well.

| Step | Answer so far (`acc`) | Next coefficient | Calculation | New answer |
|---|---:|---:|---|---:|
| 1 | 0 | 2 | 0*5 + 2 | 2 |
| 2 | 2 | 3 | 2*5 + 3 | 13 |
| 3 | 13 | 4 | 13*5 + 4 | 69 |

Fold returns 69. This is Horner's algorithm: the same computation as
`2*5^2 + 3*5 + 4`, organized as `(2*5 + 3)*5 + 4`.

## How RiX understands the callback

The ordinary RiX parser reads the source. It recognizes the parameter list,
arrow, names, multiplication and addition. It creates a function value with a
structured body representing “multiply parameter 1 by parameter 3, then add
parameter 2.” The experiment inspects that structure, rather than searching
or substituting pieces of text.

The helper only accepts a small arithmetic expression. For example, it can
prove that this body has two numeric operations and reads only its parameters.
A function containing output, unknown function calls, mutation, an implicit outer
variable, or async work cannot enter this strict compiled path.

On first use, the experiment generates and caches a JavaScript step function.
A readable equivalent is:

```js
const step = (acc, coefficient, x) =>
    acc.multiply(x).add(coefficient);
```

Here the arguments are exact RatMath Integer/Rational objects. `multiply` and
`add` are the same core arithmetic used by RiX. The actual generated code uses
checked wrappers around those methods to enforce numeric/work bounds.

The host then runs an ordinary JavaScript loop, conceptually:

```js
let acc = startingValue;
for (const coefficient of copiedCoefficients) {
    acc = step(acc, coefficient, copiedPoint);
}
return acc;
```

The parser still understands the surrounding RiX program. Inside this loop,
the repeated work runs directly in JavaScript, without repeatedly setting up
RiX callback scopes and interpreting each multiplication/addition node.
JavaScript's own runtime executes the generated function; there is no separate
machine-code compiler in this experiment.

## What is cached and what stays live

The compiled callback is cached by its live parameter/body definition. Changing
the coefficients or point supplies new input values to the same code. Changing
the body causes another compilation. The helper checks and privately snapshots
inputs each time; it does not keep a previous coefficient list or answer in
the code cache.

`Fold` explicitly chooses exact **core** arithmetic for the callback. A custom
RiX `+` overload does not apply inside that arithmetic island. `TryFold` instead
uses the conservative checks and interprets when it detects custom operators,
unsupported bodies, metadata, or evaluator budgets. An execution failure does
not restart the loop and repeat effects.

These are experimental APIs supplied by `compiler-experiments/direct-loops/run.js`.
Promoting the unrelated metadata cache does not add `.exactLoop` to production
RiX. The [experiment README](README.md) describes current bounds and limitations.
