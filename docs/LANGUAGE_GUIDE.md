# RatMath Language Guide

RatMath provides a powerful calculator environment with support for arbitrary precision integers, rationals, and complex base systems.

## Basics

- **Numbers**: Integers (`123`), Decimals (`1.5`), Rationals (`1/3`).
- **Bases**: Supports Binary (`0b10`), Octal (`0o10`), Hex (`0xA`), and arbitrary bases via `BASE <N>`.
- **Assignment**: `a = 10`
- **Comments**: `#` for line comments in Calc. RiX uses `##` for line comments and `##tag##...##tag##` for block comments.

## Variables & Scoping

RatMath distinguishes between **Static** and **Dynamic** variables.

### Static Variables (Standard)
Variables defined normally are captured **by value** when used in a function definition. This is "Snapshotting".

```javascript
a = 10
F(x) -> a * x   // F captures 'a' as 10 FOREVER
a = 20
F(1)            // Returns 10 (10 * 1)
```

### Dynamic Variables (`_` Prefix)
Variables prefixed with `_` are **Dynamic**. They are resolved when the function is **called**, not when defined.

```javascript
_b = 10
G(x) -> _b * x  // G refers to live '_b'
_b = 20
G(1)            // Returns 20 (20 * 1)
```

## Functions

Functions are first-class citizens. They can be passed as arguments.

### Definition
```javascript
F(x) -> x^2 + 1
Avg(a, b) -> (a + b) / 2
```

### Strict Definition Checks
RatMath enforces that used static variables must exist at definition time.

```javascript
// Function F uses 'y'.
// If 'y' is undefined, this throws an ERROR.
F(x) -> x + y 

// Function G uses '_y'. 
// This is ALLOWED even if '_y' is undefined.
G(x) -> x + _y
```

### Static Function Scope
When a function calls another function, it captures the **current version** of that function.

```javascript
Square(x) -> x*x
Cube(x) -> x * Square(x) // Captures Square(x) -> x*x

Square(x) -> x+x        // Redefine Square
Cube(3)                 // Still uses x*x. Returns 27.
```

To use a dynamic function reference, use `_Square` (if supported) or pass it as an argument.

## Parameters

### Ambiguity Check
When defining a function, parameter names cannot clash with valid numbers in the current base.

```javascript
// In HEX mode:
F(a) -> a       // ERROR: 'a' is the number 10 in Hex.
F(z) -> z       // OK: 'z' is not a hex digit.
```

### Base Safety
Function bodies are "frozen" to the base they were defined in.
```javascript
// Defined in DECIMAL
F(x) -> x * 10 

// Switch to HEX
F(2) 
// Result is 20 (Decimal) -> 14 (Hex).
// It does NOT interpret '10' as 16 (Hex).
```

### Optional Parameters & Defaults
Parameters can have default values using `?`.

```javascript
Inc(x, amount?1) -> x + amount
Inc(10)    // 11
Inc(10, 5) // 15
```

**Static Defaults**: Default values are captured statically.
```javascript
val = 5
F(x?val) -> x // Captures val=5
val = 10
F()           // Returns 5
```

**Dynamic Defaults**: Use `_` prefix for dynamic defaults.
```javascript
G(x?_val) -> x // Looks up _val at call time
```

## Modules
Load modules using `LOAD <module>`.
