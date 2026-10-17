import { readFile } from 'node:fs/promises';
import { Integer, rix, registry, systemContext } from '../runtime.js';

export const powerSource = await readFile(new URL('./scripts/modular-powers.rix', import.meta.url), 'utf8');
export const asyncSource = await readFile(new URL('./scripts/async-scopes.rix', import.meta.url), 'utf8');
const lower = (source) => rix.lower(rix.parse(rix.tokenize(source)));
export const powerIR = lower(powerSource), asyncIR = lower(asyncSource);
const systemStarted = performance.now();
const asyncSystem = rix.createDefaultSystemContext({ frozen: false });
asyncSystem.registerHost('fetch', { impl: async ([id], context) => context.getEnv('__whole_script_host__').fetch(id) });
asyncSystem.registerHost('publish', { impl: ([id, result], context) => context.getEnv('__whole_script_host__').publish(id, result) });
asyncSystem.freeze();
export const asyncSystemSetupMs = performance.now() - systemStarted;

function random(seed) {
  let state = seed >>> 0;
  return () => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return state >>> 0; };
}
export function makePowerFixture({ count = 24, bits = 2048, exponentBits = 1024, seed = 0x23456789 } = {}) {
  if (!Number.isInteger(count) || count < 1 || count > 4096 || !Number.isInteger(bits) || bits < 8 || bits > 8192 ||
      !Number.isInteger(exponentBits) || exponentBits < 1 || exponentBits > 4096) throw new RangeError('Invalid fixture size');
  const draw = random(seed);
  const integer = (width) => {
    let value = 0n;
    for (let consumed = 0; consumed < width; consumed += 32) value = value << 32n | BigInt(draw());
    return value & ((1n << BigInt(width)) - 1n) | 1n << BigInt(width - 1);
  };
  const modulus = integer(bits) | 1n, exponent = integer(exponentBits);
  const bases = Array.from({ length: count }, () => integer(bits) % modulus);
  return { count, bits, exponentBits, seed, bases, exponent, modulus,
    integers: bases.map((n) => new Integer(n)), exponentInteger: new Integer(exponent), modulusInteger: new Integer(modulus) };
}

// Definitions, loops, calls and maps are all in the saved RiX script. Only the
// host's binding of external inputs lives here; no JS outer computational loop.
export function runPowerRix(fixture) {
  const context = new rix.Context();
  context.set('bases', { type: 'sequence', values: fixture.integers });
  context.set('exponent', fixture.exponentInteger); context.set('modulus', fixture.modulusInteger);
  let result;
  for (const node of powerIR) result = rix.evaluate(node, context, registry, systemContext);
  return result.values;
}

export function makeAsyncFixture({ count = 128, seed = 0x456789ab, bias = 0x12345678n } = {}) {
  if (!Number.isInteger(count) || count < 1 || count > 16384) throw new RangeError('Invalid job count');
  const draw = random(seed);
  return { count, seed, jobs: Array.from({ length: count }, (_, i) => new Integer(BigInt(i + 1))),
    payloads: Array.from({ length: count }, () => new Integer(BigInt(draw()))), bias: new Integer(bias) };
}

export function createHost(fixture, { delayMs = 0, failAt = -1, publishFailAt = -1 } = {}) {
  const trace = [], published = [];
  let waitMs = 0, fetches = 0;
  const fetch = async (id) => {
    const index = Number(id.value) - 1;
    trace.push(['fetch', id.value.toString()]); fetches++;
    const started = performance.now();
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    else await Promise.resolve();
    waitMs += performance.now() - started;
    if (index === failAt) throw new Error(`Fixture fetch failed at ${index + 1}`);
    if (!Number.isSafeInteger(index) || index < 0 || index >= fixture.payloads.length) throw new RangeError('Unknown host job');
    trace.push(['fetched', id.value.toString()]);
    return fixture.payloads[index];
  };
  const publish = (id, result) => {
    if (Number(id.value) - 1 === publishFailAt) throw new Error(`Fixture publish failed at ${id.value}`);
    trace.push(['publish', id.value.toString(), result.value.toString()]);
    published.push(result);
    return result;
  };
  return { fetch, publish, trace, published, stats: () => ({ waitMs, fetches, published: published.length, delayMs }) };
}

export async function runAsyncRix(fixture, host) {
  const context = new rix.Context();
  context.set('jobs', { type: 'sequence', values: fixture.jobs }); context.set('bias', fixture.bias);
  context.setEnv('__whole_script_host__', host);
  let result;
  for (const node of asyncIR) result = await rix.evaluateAsync(node, context, registry, asyncSystem);
  return result.values;
}

export const integerKeys = (values) => values.map((value) => {
  if (!(value instanceof Integer)) throw new TypeError('Integer output required');
  return value.value.toString();
});
