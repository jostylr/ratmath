#!/usr/bin/env bun
/**
 * RiX Runner & REPL
 * 
 * Usage:
 *   bun rix/tools/rix.js <input.rix>    # Run a script
 *   bun rix/tools/rix.js                 # Start REPL
 */

import { readFileSync } from "fs";
import { createInterface } from "readline";
import { parseAndEvaluate } from "../eval/src/evaluator.js";
import { Context } from "../eval/src/context.js";

function formatResult(val) {
    if (val === null || val === undefined) return "null";

    // Handle RiX internal object types
    if (typeof val === "object" && val !== null) {
        if (val.type === "string") return val.value;
        if (val.type === "sequence") {
            const open = val.kind === "set" ? "{| " : val.kind === "tuple" ? "( " : "[";
            const close = val.kind === "set" ? " |}" : val.kind === "tuple" ? " )" : "]";
            const items = val.values || val.elements || [];
            return open + items.map(formatResult).join(", ") + close;
        }
        if (val.type === "set" || val.type === "tuple") {
            const open = val.type === "set" ? "{| " : "( ";
            const close = val.type === "set" ? " |}" : " )";
            return open + val.values.map(formatResult).join(", ") + close;
        }
        if (val.type === "map") {
            const entries = [];
            const mapObj = val.entries || val.elements || new Map();
            mapObj.forEach((v, k) => {
                entries.push(`${k}=${formatResult(v)}`);
            });
            return `{= ${entries.join(", ")} }`;
        }
        if (val.type === "interval") return `${val.start || val.lo}:${val.end || val.hi}`;
    }

    return val.toString();
}

async function main() {
    const args = process.argv.slice(2);
    const context = new Context();

    if (args.length > 0) {
        // Run file
        const inputFile = args[0];
        if (inputFile === "--help" || inputFile === "-h") {
            console.log("Usage: bun rix/tools/rix.js [file.rix]");
            process.exit(0);
        }

        try {
            const source = readFileSync(inputFile, "utf-8");
            const result = parseAndEvaluate(source, { context });
            if (result !== null && result !== undefined) {
                console.log(formatResult(result));
            }
        } catch (error) {
            console.error(`Error: ${error.message}`);
            process.exit(1);
        }
    } else {
        // REPL
        console.log("RiX REPL (Type 'exit' or Ctrl+C to quit)");
        const rl = createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: "rix> "
        });

        rl.prompt();

        rl.on("line", (line) => {
            const trimmed = line.trim();
            if (trimmed === "exit" || trimmed === "quit") {
                rl.close();
                return;
            }

            if (!trimmed) {
                rl.prompt();
                return;
            }

            try {
                const result = parseAndEvaluate(trimmed, { context });
                if (result !== null && result !== undefined) {
                    console.log(formatResult(result));
                }
            } catch (error) {
                console.error(`Error: ${error.message}`);
            }
            rl.prompt();
        });

        rl.on("close", () => {
            console.log("\nBye!");
            process.exit(0);
        });
    }
}

main();
