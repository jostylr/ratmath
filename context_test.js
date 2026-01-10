
const { VariableManager } = require('./packages/algebra/src/index.js');
const { Rational } = require('./packages/core/src/index.js');

const vm = new VariableManager();

// registerJSFunction logic test
// Attempt to define one that uses 'this'
vm.functions.set("TestFunc", {
    type: 'js',
    params: ["x"],
    handler: function (x) {
        if (this && this.variables) {
            return "Context Found: " + this.variables.get("VAR");
        }
        return "No Context";
    }
});

vm.variables.set("VAR", "MyValue");

// Currently handleFunctionCall uses `func.handler(...argValues)`
// So `this` will likely be undefined or global.
// We expect this to fail or return "No Context".

const res = vm.handleFunctionCall("TestFunc", "10");
console.log("Result:", res);
