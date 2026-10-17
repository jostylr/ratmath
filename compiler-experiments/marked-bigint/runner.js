import { createHash } from 'node:crypto';
import { rix, Integer, systemContext } from '../runtime.js';
import { compileFunction } from './compiler.js';

const BODY = 'EXPERIMENT_BIGINT_BODY';
const unwrapped = (fn) => fn?.body?.fn === BODY ? fn.body.args[0].definition : fn;
const clean = (value) => JSON.parse(JSON.stringify(value, (key, v) => ['pos', 'original'].includes(key) ? undefined : v));
const sha = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const unsupported = (message) => { throw new Error(message); };
const defaultSequence = rix.createDefaultRegistry().get('ARRAY').impl([], new rix.Context(), v => v);
const defaultProto = defaultSequence._ext.get('_proto');
const protoEntries = [...defaultProto.entries];
const kernelMethods = ['BITLENGTH', 'MAP', 'REDUCE', 'LEN', 'GET', 'LAST', 'REVERSE', 'SLICE', 'PUSH'];

function plainParameters(params) {
  if (!params || params.positional?.some(p => p.holeDefault !== null || p.isRest) ||
      ['keyword', 'conditionals', 'prep'].some(k => params[k]?.length) || params.prepStrict ||
      Object.keys(params.metadata || {}).length) unsupported('parameter machinery');
  return params.positional.map(p => p.name);
}

// Guard actual RiX values, rather than assuming the annotation supplies types.
// Metadata and custom arithmetic objects must retain interpreter dispatch.
function input(value) {
  if (value instanceof Integer && Object.getPrototypeOf(value) === Integer.prototype &&
      !Object.getOwnPropertyNames(value).length && !Object.getOwnPropertySymbols(value).length) {
    const n = value.value;
    if ((n < 0n ? -n : n).toString(2).length > 8192) unsupported('integer input budget');
    return { raw: n, type: { kind: 'integer', sign: n > 0n ? 'positive' : n === 0n ? 'nonnegative' : 'any' } };
  }
  if (value?.type === 'sequence' && Object.getPrototypeOf(value) === Object.prototype &&
      Array.isArray(value.values) && value.values.length && value.values.length <= 4096 &&
      Object.getOwnPropertyNames(value).every(k => ['type', 'values', '_ext'].includes(k)) &&
      !Object.getOwnPropertySymbols(value).length &&
      (!value._ext || (value._ext instanceof Map && [...value._ext.keys()].every(k => ['_mutable', '_proto', '_type'].includes(k)) &&
        (!value._ext.has('_proto') || value._ext.get('_proto') === defaultProto) &&
        (!value._ext.has('_type') || (value._ext.get('_type')?.type === 'string' && value._ext.get('_type').value === 'array'))))) {
    const items = Array.from(value.values, input);
    if (items.some(x => x.type.kind !== 'integer')) unsupported('only flat Integer input sequences');
    return { raw: items.map(x => x.raw), type: { kind: 'sequence', element: { kind: 'integer',
      sign: items.every(x => x.raw > 0n) ? 'positive' : items.every(x => x.raw >= 0n) ? 'nonnegative' : 'any' } } };
  }
  unsupported('unsupported input representation');
}

function box(value, type, seen = new Map()) {
  if (type.kind === 'integer') return new Integer(value);
  if (type.kind === 'boolean') return value ? new Integer(1n) : null;
  if (type.kind === 'sequence') {
    if (seen.has(value)) return seen.get(value);
    const ext = new Map(defaultSequence._ext);
    ext.set('_mutable', new Integer(1n));
    ext.set('_type', { type: 'string', value: 'array' });
    const result = { type: 'sequence', _ext: ext, values: [] };
    seen.set(value, result);
    result.values = value.map(v => box(v, type.element, seen));
    return result;
  }
  throw new Error('Compiler returned an unsupported type');
}

function definitionsFor(entry, context) {
  const definitions = new Map(), active = new Set();
  const add = (fn, name) => {
    if (active.has(name)) unsupported('recursive dependency');
    if (definitions.has(name)) return;
    if (fn?.type !== 'function' || fn.__closureScopes?.length || fn.__rixCapturedEnv?.size) unsupported('nonplain or captured callable');
    const original = unwrapped(fn);
    plainParameters(original.params);
    active.add(name);
    const visit = (node) => {
      if (!node || typeof node !== 'object') return;
      if (node.fn === 'CALL') add(context.getCallable(node.args[0]), node.args[0]);
      if (Array.isArray(node.args)) node.args.forEach(visit);
    };
    visit(original.body);
    active.delete(name);
    definitions.set(name, { fn: 'FUNCDEF', args: [name, original.params, original.body] });
    if (definitions.size > 64) unsupported('dependency budget');
  };
  add(entry, entry.name);
  const ir = clean([...definitions.values()]);
  if (JSON.stringify(ir).length > 128 * 1024) unsupported('definition size budget');
  return ir;
}

export function createMarkedSession({ maxCacheEntries = 64 } = {}) {
  if (!Number.isInteger(maxCacheEntries) || maxCacheEntries < 1 || maxCacheEntries > 256) throw new RangeError('Cache limit must be 1..256');
  const registry = rix.createDefaultRegistry(), cache = new Map(), markedBodies = new WeakMap();
  const define = registry.get('FUNCDEF').impl;
  registry.override('FUNCDEF', (args, context, evaluate) => {
    // Let RiX create the normal function and any automatic symbolic spec from
    // the ORIGINAL body before installing the execution hook.
    const fn = define(args, context, evaluate), record = markedBodies.get(args[2]);
    // If automatic specs are disabled, retain the original reflective body
    // for later explicit .Spec use rather than hiding it behind a hook.
    const symbolicMode = context.getEnv('symbolicAutoSpec', rix.runtimeDefaults.symbolicAutoSpec);
    if (record && ![false, 'off', 'none'].includes(symbolicMode)) fn.body = { fn: BODY, args: [record], pos: args[2].pos };
    return fn;
  });
  const baseline = [...registry.functions].map(([name, entry]) => ({ name, entry, impl: entry.impl, variants: [...(entry.variants || [])] }));
  const stats = { calls: 0, compileAttempts: 0, builds: 0, compileFailures: 0, cacheHits: 0,
    compiledCalls: 0, fallbacks: 0, guardFallbacks: 0, evictions: 0, compileMs: 0, reasons: {} };
  const remember = (key, entry) => {
    if (cache.size >= maxCacheEntries) { cache.delete(cache.keys().next().value); stats.evictions++; }
    cache.set(key, entry);
  };
  const fallback = (reason, record, context, evaluate) => {
    stats.fallbacks++;
    stats.reasons[reason] = (stats.reasons[reason] || 0) + 1;
    return context.withSharedBody(record.definition.body, () => evaluate(record.definition.body));
  };
  registry.register(BODY, ([record], context, evaluate) => {
    stats.calls++;
    let args, types, definitions;
    try {
      if (context.getEnv('defaultLoopMax', 10000) !== 10000 || context.getEnv('__trace_context__')?.active)
        unsupported('custom loop limit or tracing');
      if (rix.runtimeDefaults.defaultLoopMax !== 10000 ||
          context.getEnv('defaultConstructorCaptureMode', rix.runtimeDefaults.defaultConstructorCaptureMode) !== 'deep_copy')
        unsupported('custom runtime defaults');
      if (context.getEnv('numInputBase') !== undefined) unsupported('custom literal input base');
      if (defaultProto.entries.size !== protoEntries.length || protoEntries.some(([name, entry]) => defaultProto.entries.get(name) !== entry) ||
          kernelMethods.some(name => context.getEnv('__system_context__')?.resolveMethodExtension(['Integer', 'Array', 'Sequence'], name)))
        unsupported('custom method dispatch');
      if (baseline.some(({ name, entry, impl, variants }) => registry.get(name) !== entry || entry.impl !== impl ||
          (entry.variants || []).length !== variants.length || variants.some((v, i) => entry.variants[i] !== v)))
        unsupported('modified operator registry');
      const names = plainParameters(record.definition.params);
      const inputs = names.map(name => input(context.get(name)));
      args = inputs.map(x => x.raw); types = inputs.map(x => x.type);
      definitions = definitionsFor(context.getCurrentCallable(), context);
    } catch (error) { return fallback(error.message, record, context, evaluate); }
    const key = sha(['marked-bigint-v1', record.definition.name, definitions, types]);
    let entry = cache.get(key);
    if (entry) { stats.cacheHits++; cache.delete(key); cache.set(key, entry); }
    else {
      stats.compileAttempts++;
      const start = performance.now();
      try {
        const compiled = compileFunction(definitions, record.definition.name, types);
        // Explicitly a trusted local experiment: execute compiler-generated JS.
        // Names and arguments are never inserted as executable source text.
        entry = { key, status: 'compiled', types, ...compiled,
          run: new Function(`"use strict";\n${compiled.moduleSource}`)() };
        stats.builds++;
      } catch (error) {
        entry = { key, status: 'rejected', types, reason: error.message };
        stats.compileFailures++;
      } finally { stats.compileMs += performance.now() - start; }
      remember(key, entry);
    }
    if (entry.status === 'rejected') return fallback(entry.reason, record, context, evaluate);
    let result;
    try { result = entry.run(...args); }
    catch (error) {
      // Only explicit pure-kernel guards permit a retry. Other exceptions are
      // visible bugs/errors, never silently re-executed by the interpreter.
      if (!error.bigintFallback) throw error;
      stats.guardFallbacks++;
      return fallback(error.message, record, context, evaluate);
    }
    stats.compiledCalls++;
    return box(result, entry.returnType);
  }, { lazy: true });

  const load = (source) => {
    if (typeof source !== 'string' || Buffer.byteLength(source) > 256 * 1024) throw new RangeError('RiX source must be <=256 KiB');
    const ast = rix.parse(rix.tokenize(source)), ir = rix.lower(ast), markers = [];
    // Inspect real comment AST nodes, so quoted strings cannot become markers.
    // For this first experiment markers apply to adjacent top-level functions.
    ast.forEach((node, index) => {
      if (node.type !== 'Comment' || node.value.trim() !== '@bigint') return;
      const next = ast[index + 1], definition = ir[index + 1];
      if (next?.expression?.type !== 'FunctionDefinition' || definition?.fn !== 'FUNCDEF' ||
          !/^\s*$/.test(source.slice(node.pos[2], next.pos[1])))
        throw new SyntaxError('@bigint must immediately precede a top-level function definition');
      const [name, params, body] = definition.args;
      const record = { definition: { name, params, body } };
      markedBodies.set(body, record);
      markers.push(name);
    });
    return { source, ir, markers, run({ context = new rix.Context(), bindings = {} } = {}) {
      for (const [name, value] of Object.entries(bindings)) context.set(name, value);
      let result;
      for (const node of ir) result = rix.evaluate(node, context, registry, systemContext);
      return result;
    } };
  };
  return { load, stats, clearCache: () => cache.clear(),
    inspectCache: () => [...cache.values()].map(({ run, ...entry }) => ({ ...entry })) };
}
