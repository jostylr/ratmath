
# Validating JavaScript Integrations for RatMath

This guide explains how to convert JavaScript code into loadable modules for `ratmath` (Calc and WebCalc).

## 1. Wrapper Structure

Create a JavaScript file (e.g. `your-module.js`) that exports `functions` and `variables` objects compatible with `VariableManager`.

### Example Wrapper

```javascript
// Import your core logic
import * as MyLib from './my-lib.js';

/**
 * RatMath Module Wrapper
 */
export const functions = {
    "MyFunc": {
        type: 'js',
        // Wrapper function to adapt arguments if needed
        body: (x, y) => MyLib.compute(x, y),
        // Parameter names for help/validation
        params: ["x", "y"], 
        // Documentation string shown in HELP
        doc: "Computes something useful"
    },
    // ... more functions
};

export const variables = {
    "MY_CONST": new Rational(123),
    // ... more variables
};
```

## 2. Argument Handling

RatMath passes arguments as `Rational`, `Integer`, `RationalInterval`, or other internal types. Your wrapper should handle these types or convert them if your library expects standard JS numbers.

```javascript
import { Rational, Integer } from "@ratmath/core";

// ... in wrapper ...
body: (x) => {
    // Basic type check/conversion
    if (x instanceof Rational) {
       x = x.toNumber();
    }
    return MyLib.doSomething(x);
}
```

## 3. Bundling for Web

Use `bun build` (or similar bundler) to produce an ESM module suitable for the browser.

```bash
bun build src/your-module.js --outfile docs/your-module.js --format esm --target browser
```


## 4. Loading in RatMath

### WebCalc
Load the module via URL query parameter or `LOAD` command.
- **Query Param**: `?load=your-module.js` (if hosted at root) or `?load=http://.../your-module.js`.
- **Command**: `LOAD your-module.js`.

### CLI
Load via `--load` flag or `LOAD` command.
```bash
bun calc --load your-module.js
```
```
> LOAD your-module.js
```

## 5. Advanced Features

### Optional Arguments
Append `?` to parameter names to make them optional. The `defaults` handling is up to your wrapper body.

```javascript
    params: ["x", "precision?"], 
    body: (x, prec) => {
        if (prec === undefined) prec = -6;
        return MyLib.compute(x, prec);
    }
```

### Accessing Environment Variables
The wrapper function's `this` context is bound to the `VariableManager` instance. You can access variables (like environment settings) via `this.variables`.

```javascript
    body: function(x, prec) {
        // Check for 'PRECISION' variable if 'prec' argument is missing
        if (prec === undefined && this.variables.has("PRECISION")) {
             prec = this.variables.get("PRECISION").toNumber();
        }
        return MyLib.compute(x, prec);
    }
```
*Note: Use `function()` syntax instead of arrow functions to preserve `this` binding.*

## 6. Directory Structure Recommendation

For core packages, we recommend:
- `packages/your-pkg/src` - Source code
- `packages/your-pkg/src/ratmath-module.js` - The wrapper
- `apps/webcalc/package.json` - Add `build-your-pkg` script

See `packages/reals` for a reference implementation.

