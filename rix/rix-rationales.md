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

## Code Blocks Share Scope in Construct Positions (2026-03-28)

### The problem: double scoping

Scope-creating constructs like loops create a single isolated scope for all their sub-parts. When a loop has four parts — `{@ init; cond; body; update }` — all four share one scope, so a variable created in init is visible in the other three.

But if a user wraps one of those parts in a code block for multi-statement grouping — `{@ {; x = 1; y = 10 }; x < 4; x + y; x += 1 }` — the code block would normally create its own isolated scope. The variable `x` would be trapped inside the init block and invisible to the condition, body, and update. This double-scoping defeats the purpose of using a block for grouping.

### The principle: blocks in lazy construct positions are grouping, not isolation

When a code block appears as a sub-part of a scope-creating construct, it shares the construct's scope rather than creating an additional isolation boundary. The block acts as multi-statement grouping, not as a scope fence.

This applies generally to any lazy construct that manages its own scope and evaluates sub-parts within it:

- **Loop sub-parts**: init, condition, body, and update blocks all share the loop scope.
- **`.Test` expressions**: setup blocks and test blocks share the test scope (this was the original use case that motivated `withSharedBody`).

### Nested isolation via double braces

If a user genuinely wants an isolated block inside a construct position, they nest braces: `{ { x = 1 } }`. The outer block shares the construct's scope (it's in a construct position), but the inner block creates its own isolated scope as usual. Note that an extra space may be needed to avoid parser ambiguity with other brace forms.

### Implementation

The mechanism uses `context.withSharedBody(node, callback)`, which signals to the next BLOCK/LOOP/SYSTEM evaluation that it should reuse the current scope instead of pushing a new one. This is a one-shot override — only the immediately evaluated scope-creating node is affected; any nested blocks within it still create their own scopes.

The `evaluateShared(node, context, evaluate)` helper in `control.js` wraps this pattern for easy reuse by any construct that needs it.

## Why .TestError and .TestStop Are Separate from .Test (2026-03-28)

### Why not add abort-testing as an option on .Test(...)

`.Test(...)` is built around the idea of normal completion: a test passes when evaluation returns a non-null value. Adding an "expected error" flag would require `.Test(...)` to handle two fundamentally different success criteria — normal returns and specific abnormal completions — in the same dispatch path. That conflation would make the pass/fail logic harder to read and reason about.

`.TestError(...)` and `.TestStop(...)` invert the success criterion entirely: they pass on abnormal completion of a specific kind, and fail on normal completion. This is a semantic reversal, not just a parameter variation. Keeping them separate preserves the invariant that each test form has exactly one, unambiguous definition of "pass."

### Why setup aborting always fails the test

The setup block is not part of what is being tested — it exists to establish preconditions. If setup itself aborts, the provenance of the abort is ambiguous: the test cannot distinguish "the code under test misbehaved" from "the preconditions were never established." Rather than silently misattribute an abort, both `.TestError(...)` and `.TestStop(...)` treat any setup abort as an unconditional failure, with the setup outcome recorded separately in the result object.

### Why .TestError includes both explicit .Error(...) and runtime errors

Both kinds of failure signal "this code path should not complete normally":

- An explicit `.Error("msg")` is a deliberate structured abort emitted by code that detects an illegal condition.
- A runtime error (division by zero, undefined variable, type mismatch) is an unintended failure detected by the interpreter.

From a testing perspective, both are valid "should fail here" cases. Distinguishing them at the test-expectation level would require callers to predict exactly how a failure manifests, which is often brittle. `.TestError(...)` accepts either, and the result's `expr.outcome` field records which kind actually occurred, so callers can inspect the distinction if needed.

### Why .TestStop is kept separate from .TestError

`.Stop(...)` signals a different semantic category than an error. It represents a deliberate, conditional halt — "preconditions not met, stop here" — rather than a defect. Code that guards against invalid input may be entirely correct behavior, not a failure to be caught. A test that expects a stop is asserting "this guard fires under these conditions," which is meaningfully different from "this code path crashes."

Combining stop and error expectations into a single `.TestAbort(...)` would lose the signal about which kind of abnormal completion is intended. `.TestStop(...)` makes the assertion explicit: this code is expected to stop, not error.
