# RatMath Package Authoring Guide

This document describes how to create packages for RatMath that can be loaded via the `LOAD` command.

## Package Structure

A typical package has this structure:

```
packages/mypackage/
├── src/
│   ├── index.js           # Main exports
│   └── ratmath-module.js  # VariableManager-compatible module
├── help/
│   ├── mypackage.txt      # Main help file
│   └── topic.txt          # Additional help topics
└── package.json
```

## Module Export Format (ratmath-module.js)

The key file for VariableManager integration is `ratmath-module.js`. It must export:

### Functions

```javascript
export const functions = {
    "FunctionName": {
        type: 'js',
        handler: function (arg1, arg2, optionalArg) {
            // 'this' is the VariableManager instance
            // Access env vars: this.variables.get("_precision")
            return result;
        },
        params: ["arg1", "arg2", "optionalArg?"],  // ? = optional
        doc: "Description of the function"
    }
};
```

### Variables (optional)

```javascript
export const variables = {
    "CONSTANT_NAME": someValue
};
```

## Function Definition Rules

### Naming
- **Uppercase start** = Function/List (callable): `Sin`, `MyFunc`, `EXP`
- **lowercase start** = Variable (value): `x`, `myVar`
- Both `Sin` and `SIN` should work - provide aliases if needed

### Parameters
- Required: `"argName"`
- Optional: `"argName?"` (append `?`)

### Unlimited Arguments (Variadic Functions)

For functions that need unlimited arguments, use `this._currentCallScope.get("@@")`:

```javascript
"Concat": {
    type: 'js',
    handler: function (first) {
        // Get all arguments via @@ sequence
        const allArgs = this._currentCallScope?.get("@@");
        if (!allArgs || allArgs.type !== 'sequence') {
            return first;
        }
        
        // Process all arguments
        let result = "";
        for (const arg of allArgs.values) {
            result += extractString(arg);
        }
        return { type: 'string', value: result };
    },
    params: ['first'],  // Only first is required for param checking
    doc: 'Concatenate unlimited strings'
}
```

The `@@` sequence contains all evaluated arguments passed to the function. This allows truly variadic behavior without artificial limits.

### Return Types

| Type | Format | Example |
|------|--------|---------|
| Integer | `new Integer(BigInt(n))` | `new Integer(5n)` |
| Rational | `new Rational(num, denom)` | `new Rational(3n, 4n)` |
| Interval | `new RationalInterval(low, high)` | `new RationalInterval(r1, r2)` |
| String | `{ type: 'string', value: str }` | `{ type: 'string', value: 'hello' }` |
| Sequence | `{ type: 'sequence', values: [...] }` | `{ type: 'sequence', values: [v1, v2] }` |

### Accessing Environment

```javascript
handler: function (x) {
    // Access _precision environment variable
    const prec = this.variables.get("_precision");
    
    // Access scope chain (for advanced use)
    const chain = this._currentScopeChain;
    
    return result;
}
```

## Help Files

Place `.txt` files in `packages/mypackage/help/`:

### Main help file (mypackage.txt)
```
MyPackage - Brief Description

FUNCTIONS:
  Func1(x)        - Does something
  Func2(a, b)     - Does something else

EXAMPLES:
  Func1(5)        → result
```

### Additional topics (topic.txt)
For `HELP topic` or `HELP mypackage-topic`:
```
Topic Name - Detailed Information

DETAILS:
  ...
```

### Registering Help Topics

Add to `packages/algebra/src/help-registry.js`:

```javascript
const StaticHelp = {
    // ...existing topics...
    
    mytopic: `Help text here...`,
};
```

And update `getHelpTopicsText()` to list the new topic.

## Package Registry

Register in `packages/algebra/src/package-registry.js`:

```javascript
export const PackageRegistry = {
    // ...existing packages...
    
    mypackage: {
        name: "MyPackage",
        description: "Brief description",
        path: "@ratmath/mypackage/src/ratmath-module.js",
        dependencies: [],  // other package keys
        help: `Detailed help text...`
    }
};
```

## Complete Example

### packages/example/src/ratmath-module.js

```javascript
import { Integer, Rational, RationalInterval } from "@ratmath/core";

export const functions = {
    "Double": {
        type: 'js',
        handler: function (x) {
            if (x instanceof Integer) {
                return new Integer(x.value * 2n);
            }
            if (x instanceof Rational) {
                return new Rational(x.numerator * 2n, x.denominator);
            }
            if (x instanceof RationalInterval) {
                return x.multiply(new Rational(2n, 1n));
            }
            throw new Error("Double expects a number");
        },
        params: ["x"],
        doc: "Doubles the input value"
    },
    
    "DOUBLE": {  // Uppercase alias
        type: 'js',
        handler: function (x) {
            return functions.Double.handler.call(this, x);
        },
        params: ["x"],
        doc: "Alias for Double"
    },
    
    "Greet": {
        type: 'js',
        handler: function (name) {
            const n = extractString(name);
            return { type: 'string', value: `Hello, ${n}!` };
        },
        params: ["name"],
        doc: "Returns a greeting string"
    }
};

export const variables = {
    // Optional: export constants
};

function extractString(val) {
    if (val?.type === 'string') return val.value;
    if (typeof val === 'string') {
        return val.replace(/^"|"$/g, '');
    }
    return val?.toString() ?? '';
}
```

### packages/example/help/example.txt

```
Example Package

FUNCTIONS:
  Double(x)       - Doubles a number
  DOUBLE(x)       - Alias for Double
  Greet(name)     - Returns greeting string

EXAMPLES:
  Double(5)       → 10
  Greet("World")  → "Hello, World!"
```

## Loading Packages

Users load packages with:
```
LOAD example
LOAD @@Example
```

After loading, functions are available:
```
Double(5)       → 10
```

## Testing

Create tests in `packages/mypackage/tests/`:

```javascript
import { describe, test, expect } from "bun:test";
import { VariableManager } from "@ratmath/algebra";
import * as MyModule from "../src/ratmath-module.js";

test("Double function", () => {
    const vm = new VariableManager();
    vm.loadModule("Example", MyModule);
    
    const result = vm.processInput("Double(5)");
    expect(result.type).toBe("expression");
    expect(result.result.toString()).toBe("10");
});
```

Run tests:
```bash
bun test packages/mypackage/tests/
```

## Best Practices

1. **Provide aliases** - Both `Exp` and `EXP` should work
2. **Handle all numeric types** - Integer, Rational, RationalInterval
3. **Use `this` for context** - Access env vars via `this.variables`
4. **Document thoroughly** - Help files and function `doc` strings
5. **Test comprehensively** - Unit tests for all functions
6. **Handle errors gracefully** - Throw descriptive Error messages
