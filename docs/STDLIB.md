# Standard Library

The RatMath Standard Library (`@ratmath/stdlib`) provides a collection of essential functions for logic, control flow, list manipulation, and scope management. These functions are available by default in the Calculator and Web Calculator.

## Core Functions

### `ASSIGN(name, value)`
Assigns a value to a variable in the **current local scope**.
- **Aliases**: None
- **Example**: `ASSIGN("x", 10)` sets local `x` to 10.

### `GLOBAL(name, value)`
Assigns a value to a variable in the **global scope**.
- **Aliases**: None
- **Example**: `GLOBAL("G", 99)` sets global `G` to 99, accessible everywhere.

### `GETVAR(name, level?)`
Retrieves a variable's value from a specific scope level.
- **Levels**:
    - `0` (default): Standard lookup (current -> parent -> global).
    - `1`: Parent scope.
    - `-1`: Global scope.
- **Example**: `GETVAR("x", -1)` gets the global `x`.

### `IF(condition, trueExpr, falseExpr?)`
**Lazy Evaluation**. conditionally evaluates expressions.
- If `condition` is truthy (non-zero), evaluates and returns `trueExpr`.
- Otherwise, evaluates and returns `falseExpr` (or 0 if omitted).
- **Example**: `IF(EQ(x, 0), "Zero", "Non-Zero")`

### `MULTI(expr1, expr2, ...)`
**Lazy Evaluation**. Executes multiple expressions in sequence and returns the result of the last one. Useful for chaining side effects.
- **Example**: `MULTI(ASSIGN("x", 10), ASSIGN("y", 20), x*y)` returns 200.

## Logic Functions

### `EQ(a, b)`
Checks equality. Returns 1 if `a == b`, else 0.
- **Example**: `EQ(5, 5)` -> 1

### `NEQ(a, b)`
Checks inequality. Returns 1 if `a != b`, else 0.
- **Example**: `NEQ(5, 6)` -> 1

### `GT(a, b)`, `LT(a, b)`, `GTE(a, b)`, `LTE(a, b)`
Greater Than, Less Than, etc. Returns 1 (true) or 0 (false).

## List Functions

### `LEN(list)`
Returns the length of a list.
- **Example**: `LEN([1, 2, 3])` -> 3

### `GET(list, index)`
Returns element at index.
- **Example**: `GET([10, 20], 1)` -> 20

### `MAP(list, func)`
Applies `func` to each element.
- **Example**: `MAP([1, 2, 3], x->x*2)` -> `[2, 4, 6]`

### `FILTER(list, predicate)`
Keeps elements where `predicate` returns true.
- **Example**: `FILTER([1, 2, 3, 4], x->GT(x, 2))` -> `[3, 4]`

### `REDUCE(list, func, initial)`
Reduces list to single value.
- **Example**: `REDUCE([1, 2, 3], (acc, x)->acc+x, 0)` -> 6

### `RANGE(start, end, step?)`
Generates a sequence.
- **Example**: `RANGE(1, 4)` -> `[1, 2, 3]`
