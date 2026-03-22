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
