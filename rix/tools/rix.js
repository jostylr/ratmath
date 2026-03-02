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
import {
    tokenize,
    parse,
    lower,
    evaluate,
    Context,
    createDefaultRegistry,
    parseAndEvaluate
} from "../eval/index.js";
import { Rational, RationalInterval } from "@ratmath/core";

function formatResult(val) {
    if (val === null) return "_";
    if (val === undefined) return "undefined";

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
        if (val.type === "function" || val.type === "lambda") {
            const params = val.params?.positional?.map(p => p.name).join(", ") || "";
            if (val.type === "lambda") {
                return `[Lambda: (${params})]`;
            }
            return `[Function: ${val.name || "Anonymous"}(${params})]`;
        }
        if (val.type === "pattern_function") {
            return `[PatternFunction: ${val.name || "Anonymous"}]`;
        }
        if (val.type === "sysref") {
            return `[SystemFunction: ${val.name}]`;
        }
        if (val.type === "partial") {
            const arity = (val.template || []).reduce(
                (max, t) => (t && t.type === "placeholder") ? Math.max(max, t.index) : max,
                0
            );
            return `[Partial: ${arity}]`;
        }
        if (val.type === "interval") return `${val.start || val.lo}:${val.end || val.hi}`;
    }

    if (val instanceof Rational) return val.toMixedString();
    if (val instanceof RationalInterval) return val.toMixedString();
    return val.toString();
}

function handleCommand(fullCmd, context, registry) {
    const parts = fullCmd.slice(1).match(/([a-zA-Z]+)|\[([^\]]+)\]|\(([^)]+)\)/g) || [];
    const cmd = parts[0];
    const args = parts.slice(1).map(p => {
        if (p.startsWith("[") && p.endsWith("]")) return p.slice(1, -1);
        if (p.startsWith("(") && p.endsWith(")")) return p.slice(1, -1);
        return p;
    });

    if (cmd === "help") {
        console.log(`Available commands:
  .help           Show this help message
  .exit           Exit the REPL
  .load:[pkg]     Load a package (e.g. .load[linalg])
  .vars           Show defined variables
  .fns            Show available system functions
  .reset          Reset variables and context
  .ast[expr]      Show AST of RiX expression
  .tokens[expr]   Show tokens of RiX expression
  
  Multiline input: end a line with '\\' to continue to the next line.
  Ctrl+C: Clear current input buffer or exit if empty.
`);
    } else if (cmd === "exit") {
        console.log("Bye!");
        process.exit(0);
    } else if (cmd === "load") {
        console.log(`Loading package ${args[0]}... (not fully implemented)`);
    } else if (cmd === "vars") {
        console.log("Variables:", context.getAllNames());
    } else if (cmd === "fns") {
        console.log("System Functions:", registry.getAllNames());
    } else if (cmd === "reset") {
        context.clear();
        console.log("Environment reset.");
    } else if (cmd === "ast") {
        try {
            const tks = tokenize(args[0] || "");
            const ast = parse(tks);
            console.dir(ast, { depth: null });
        } catch (e) {
            console.error("Parse Error:", e.message);
        }
    } else if (cmd === "tokens") {
        try {
            const tks = tokenize(args[0] || "");
            console.dir(tks);
        } catch (e) {
            console.error("Tokenize Error:", e.message);
        }
    } else {
        console.log("Unknown command:", cmd);
    }
}

async function main() {
    const args = process.argv.slice(2);
    const context = new Context();
    const registry = createDefaultRegistry();

    if (args.length > 0) {
        // Run file
        const inputFile = args[0];
        if (inputFile === "--help" || inputFile === "-h") {
            console.log("Usage: bun rix [file.rix]");
            process.exit(0);
        }

        try {
            const source = readFileSync(inputFile, "utf-8");
            const result = parseAndEvaluate(source, { context, registry });
            if (result !== undefined) {
                console.log(formatResult(result));
            }
        } catch (error) {
            console.error(`Error: ${error.message}`);
            process.exit(1);
        }
    } else {
        // REPL
        console.log("RiX REPL (Type .help for commands)");
        const rl = createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: "rix> "
        });

        let buffer = "";

        rl.on("SIGINT", () => {
            if (buffer.length > 0) {
                buffer = "";
                console.log("\n(cleared)");
                rl.setPrompt("rix> ");
                rl.prompt();
            } else {
                console.log("\nBye!");
                process.exit(0);
            }
        });

        rl.prompt();

        rl.on("line", (line) => {
            if (buffer === "" && line.trim().startsWith(".")) {
                handleCommand(line.trim(), context, registry);
                rl.prompt();
                return;
            }

            if (line.endsWith("\\")) {
                buffer += line.slice(0, -1) + "\n";
                rl.setPrompt("... ");
                rl.prompt();
                return;
            }

            buffer += line;
            if (buffer.trim() === "") {
                buffer = "";
                rl.setPrompt("rix> ");
                rl.prompt();
                return;
            }

            try {
                const result = parseAndEvaluate(buffer, { context, registry });
                if (result !== undefined) {
                    console.log(formatResult(result));
                }
            } catch (error) {
                console.error(`Error: ${error.message}`);
            }

            buffer = "";
            rl.setPrompt("rix> ");
            rl.prompt();
        });

        rl.on("close", () => {
            console.log("\nBye!");
            process.exit(0);
        });
    }
}

main();
