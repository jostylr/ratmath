# RiX Rationales

This document is a growing design-rationale log for RiX. It records why particular language choices were made so future extensions can follow the same model instead of re-deciding the same questions ad hoc.

## Combo Assignment Expansion

### Why these operators

Combo assignment works best for binary operators that users naturally think of as "update the current value by applying this operation". That already fits arithmetic operators such as `+=` and `*=`, and it extends cleanly to ordered-collection concatenation (`++=`) and set-style algebra (`\/=`, `/\=`, `\=`).

These are especially natural because their non-assignment forms are already read as transformations of an existing collection:

- `xs ++ ys` means append or concatenate into a new ordered collection.
- `a \/ b` means grow by union or hull.
- `a /\ b` means narrow by intersection.
- `a \ b` means remove by difference.

Using the same operators in combo form makes scripts read like in-place refinement of an existing cell rather than rebinding to a different one.

`**=`, `/^=`, and `/~=` were included because the language already had meaningful binary forms for `**`, `/^`, and `/~`, so the combo-assignment pipeline could reuse them without creating a second semantic path.

### Cell semantics

RiX variables name cells, not just values. Combo assignment therefore follows the established update rule:

```rix
x op= y   =>   x ~= x op y
@x op= y  =>   @x ~= @x op y
```

That choice keeps combo updates aligned with existing `~=` behavior:

- cell identity is preserved
- aliases keep tracking the same binding
- ordinary meta survives
- ephemeral meta is replaced from the computed rhs
- `.lock`, `.frozen`, and `.immutable` protections behave exactly as they already do for `~=`

This is preferable to rebinding because collection-oriented combo operators are usually chosen precisely when the user wants to mutate the tracked value rather than swap in a different cell.

### Documentation consistency

The documentation previously contained an inconsistency: most of the assignment model described combo operators as cell-preserving updates, but one note described them as if they lowered through plain `ASSIGN`.

The intended model is the cell-preserving one. Combo assignments lower through `ASSIGN_UPDATE` or `OUTER_UPDATE`, not plain `ASSIGN`. This rationale entry records that correction so future docs and implementation changes stay aligned.

## Comparison Operators and Identity (2026-03-28)

### Removing `?=`, `?<`, `?>`, `?<=`, `?>=` comparison aliases

RiX previously allowed `?=` as an alias for `==`, and `?<`/`?>`/`?<=`/`?>=` as aliases for the standard comparison operators. These have been removed:

1. **Redundancy.** The standard operators `==`, `<`, `>`, `<=`, `>=` are well-understood and sufficient.
2. **Freeing `?=` for parameter defaults.** With `?=` no longer a comparison operator, it can serve a clearer role as the parameter-default syntax.
3. **Cleaner operator surface.** Fewer operators means less to learn and fewer ambiguities for readers.

### Adding `===` for cell identity

RiX has a strong cell/value distinction:
- `=` creates an alias (shared cell)
- `:=` creates a fresh copy (independent cell)
- `~=` mutates a cell in place

Users need a way to test whether two names refer to the **same cell** vs. merely holding equal values. `===` fills this role:

- `x == y` — value equality: do the cells hold equal values?
- `x === y` — identity: are `x` and `y` the same cell?

This maps naturally to common programming intuition where `===` means "strict/identity" equality. In RiX, identity means same-cell, which is the most meaningful strict comparison in a cell-based language.

```rix
x := 5
y = x       ## alias — same cell
z := x      ## copy — different cell

x === y     ## 1 (same cell)
x === z     ## null (different cells)
x == z      ## 1 (same value)
```

## Hole Defaults: `?=` in Parameter Position (2026-03-28)

### Why `?=` instead of `?|`

Previously, parameter defaults used `?|` syntax: `(x ?| 2) -> ...`. This has been changed to `?=`:

1. **`?=` reads as "default assignment"** — it visually suggests "assign this default when no argument is supplied." The `=` component signals binding/assignment, and the `?` signals conditionality.

2. **`?|` remains expression-level only.** `?|` is the hole-coalescing operator in expressions: `a ?| b` returns `a` if non-hole, else evaluates `b`. Keeping it purely as an expression operator avoids overloading its meaning.

3. **Context-sensitive syntax.** `?=` is only valid in parameter/binding positions. Using it as a general expression (e.g., `5 ?= 3`) throws an error.

### Trigger semantics

`?=` defaults trigger on:
- **Omitted argument** — caller passes fewer args than parameters
- **Explicit hole** — caller passes `,` (hole) in that position

`?=` defaults do **not** trigger on `null` (`_`), `0`, empty string, empty collections, or any other non-hole value.

### `:=` Remains Fresh-Copy Assignment

`:=` always creates a new cell with a shallow copy of the right-hand value. It is not used for defaults, conditions, or any other purpose:

- `=` — alias/rebind
- `:=` — fresh copy
- `~=` — in-place update
- `?=` — parameter default (binding context only)
- `?|` — hole coalescing (expression context only)

## Receiver-First Methods

### Why method syntax exists at all

RiX methods are not a class system. They are syntax sugar over callable values that already fit the language's function-first runtime:

```rix
obj.Method(a, b)
obj.Method!(a, b)
```

The runtime resolves a callable, then invokes it as:

```rix
fn(obj, a, b)
```

That keeps the dispatch model consistent with the rest of RiX while giving scripts a more readable receiver-first surface when operating on collections and structured values.

### Why `!` marks mutation

Mutation should be visible at the call site. A trailing `!` makes that explicit without adding a separate method system or hidden mutability rules:

- `Method` means "produce a new value"
- `Method!` means "mutate the receiver"

This avoids implicit side effects and lets readers distinguish copy-producing and in-place operations immediately.

### Why method lookup is constrained

Method lookup only checks direct meta and a single `_proto` map. There is no prototype chaining in v1.

That restriction is deliberate:

- lookup order stays predictable
- direct non-callable values block fallback cleanly
- property access and method calls remain distinct operations

In particular, `obj.Method` is just meta-property access, while only `obj.Method(...)` triggers method resolution. That separation prevents a hidden second meaning for ordinary property reads.

## Diagnostics as Structured Maps (2026-03-28)

### Why diagnostics are structured maps rather than plain strings

Every diagnostic event (`.Warn`, `.Info`, `.Error`, `.Stop`, `.Test`, `.Debug`, `.Trace`) produces a RiX map value with a uniform shape (`kind`, `label`, `file`, `time`, `data`). This choice serves several purposes:

1. **Machine-consumable.** CLI tools, REPL extensions, and future editor integrations can query event fields structurally instead of parsing formatted output strings.
2. **Composable.** Because events are first-class RiX values, scripts can inspect, filter, and aggregate diagnostic results using the same pipe and collection operations used for any other data.
3. **Extensible.** Adding new fields (e.g., stack traces, severity levels) does not break existing consumers — they simply ignore unknown keys.
4. **Consistent.** A single event shape for all diagnostic kinds means one rendering pipeline handles everything.

### Why null is the pass/fail discriminator for tests

RiX has exactly one falsy value: null (`_`). Every non-null value is truthy. Using null-as-failure for `.Test` aligns with this existing truthiness model:

- Any expression that evaluates to a non-null value passes.
- Null signals absence, failure, or "nothing here" — exactly the right semantics for a failed test.
- No need for a separate assertion library: `x == expected` returns non-null on match, null on mismatch.

### Why array `.Test` mode shares state while map `.Test` mode reruns setup

The two modes serve fundamentally different testing patterns:

**Sequential (array) mode** models a scenario: "set up initial conditions, then walk through a series of dependent steps." Each test may mutate shared state, and later tests verify the cumulative effect. Stopping on first failure is natural because subsequent steps depend on earlier ones.

**Isolated (map) mode** models independent properties: "given the same starting conditions, verify N separate facts." Each test gets a fresh setup so one failure cannot contaminate others. All tests run because they are logically independent.

This maps to common testing practice: integration/scenario tests are naturally sequential, while unit/property tests are naturally isolated.

### Why `.Debug` is AST-aware rather than just value logging

A plain `print(expr)` loses the expression structure — you see the result but not what produced it. `.Debug` preserves access to the IR/AST tree before evaluation, so the debug output can show both the source-level expression and its evaluated result. This is especially valuable for:

- Debugging complex composed expressions where the final value is surprising
- Educational/REPL contexts where seeing the evaluation structure aids understanding
- Future step-through debugging where subexpression evaluation order matters

Making `.Debug` lazy (receiving unevaluated IR nodes) is the cleanest way to achieve this within the existing interpreter architecture.

### Why `.Trace` is thunk/callable-based

`.Trace` wraps execution of a callable rather than instrumenting an entire scope or file. This design:

1. **Establishes trace context before execution.** The trace environment is set up before the callable runs, so all function entry/exit events within the traced scope are captured from the start.
2. **Scopes the blast radius.** Only the wrapped callable (and its callees up to the specified depth) is traced, not all evaluation globally.
3. **Composes naturally.** `.Trace("label", depth, vars, () -> expr)` works as an expression that returns `expr`'s value, so tracing can be added and removed without restructuring code.
4. **Avoids hidden global state.** The trace context lives in the runtime environment and is restored after the callable returns, rather than being a process-wide flag.
