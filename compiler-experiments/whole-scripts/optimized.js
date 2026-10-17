import { Integer } from '../runtime.js';

// Straightforward counterpart of RiX's right-to-left square/multiply loop.
export function binaryPower(base, exponent, modulus) {
  let result = 1n % modulus;
  base %= modulus;
  while (exponent > 0n) {
    if (exponent & 1n) result = result * base % modulus;
    base = base * base % modulus;
    exponent >>= 1n;
  }
  return result;
}

// Scan a fixed exponent from the most significant bit; avoid repeated BigInt
// shifts/allocations. Schedule preparation is deliberately inside every batch.
export function makeWindowSchedule(exponent, width) {
  if (!Number.isInteger(width) || width < 1 || width > 6) throw new RangeError('Window width 1..6');
  if (exponent < 0n) throw new RangeError('Nonnegative exponent required');
  const bits = exponent === 0n ? '' : exponent.toString(2);
  const schedule = [];
  for (let i = 0; i < bits.length;) {
    if (bits[i] === '0') { schedule.push([1, 0]); i++; continue; }
    let end = Math.min(bits.length, i + width);
    while (bits[end - 1] === '0') end--;
    schedule.push([end - i, parseInt(bits.slice(i, end), 2)]);
    i = end;
  }
  return schedule;
}

export function windowPower(base, modulus, schedule, width) {
  base %= modulus;
  const odd = [base];
  const squared = base * base % modulus;
  for (let i = 1; i < 1 << (width - 1); i++) odd.push(odd[i - 1] * squared % modulus);
  let result = 1n % modulus;
  for (const [squares, power] of schedule) {
    for (let i = 0; i < squares; i++) result = result * result % modulus;
    if (power) result = result * odd[(power - 1) >> 1] % modulus;
  }
  return result;
}

export function validatePowers(bases, exponent, modulus) {
  if (!Array.isArray(bases) || !bases.length || bases.length > 4096 || bases.some((b) => typeof b !== 'bigint' || b < 0n || b.toString(2).length > 8192) ||
      typeof exponent !== 'bigint' || exponent < 0n || exponent.toString(2).length > 4096 ||
      typeof modulus !== 'bigint' || modulus < 1n || modulus.toString(2).length > 8192) throw new RangeError('Nonnegative bounded BigInt bases/exponent and positive modulus required');
}

export function powerBatch(bases, exponent, modulus, algorithm = 'window-4') {
  validatePowers(bases, exponent, modulus);
  if (algorithm === 'binary') return bases.map((base) => binaryPower(base, exponent, modulus));
  if (algorithm.startsWith('montgomery-')) {
    const width = Number(algorithm.replace('montgomery-', ''));
    const schedule = makeWindowSchedule(exponent, width), state = makeMontgomery(modulus);
    return bases.map((base) => montgomeryPower(base, schedule, width, state));
  }
  const width = Number(algorithm.replace('window-', ''));
  const schedule = makeWindowSchedule(exponent, width);
  return bases.map((base) => windowPower(base, modulus, schedule, width));
}

export function makeMontgomery(modulus) {
  if (!(modulus & 1n)) throw new RangeError('Montgomery candidate requires an odd modulus');
  const bits = modulus.toString(2).length, shift = BigInt(bits), radix = 1n << shift, mask = radix - 1n;
  let inverse = 1n;
  for (let size = 1; size < bits;) {
    size = Math.min(size * 2, bits);
    inverse = inverse * (2n - modulus * inverse) & ((1n << BigInt(size)) - 1n);
  }
  const factor = -inverse & mask;
  const multiply = (a, b) => {
    const product = a * b;
    const correction = (product & mask) * factor & mask;
    const reduced = (product + correction * modulus) >> shift;
    return reduced >= modulus ? reduced - modulus : reduced;
  };
  return { modulus, radix, multiply };
}

export function montgomeryPower(base, schedule, width, { modulus, radix, multiply }) {
  const converted = base % modulus * radix % modulus;
  const odd = [converted], squared = multiply(converted, converted);
  for (let i = 1; i < 1 << (width - 1); i++) odd.push(multiply(odd[i - 1], squared));
  let result = radix % modulus;
  for (const [squares, power] of schedule) {
    for (let i = 0; i < squares; i++) result = multiply(result, result);
    if (power) result = multiply(result, odd[(power - 1) >> 1]);
  }
  return multiply(result, 1n);
}

export function scoreBigInt(value, bias) { return (value * 1664525n + bias) % 1000003n; }
export function scoreNumber(value, bias) {
  if (typeof value !== 'bigint' || typeof bias !== 'bigint' || value < 0n || value > 0xffffffffn || bias < 0n || bias > 0xffffffffn) throw new RangeError('Unsigned 32-bit inputs required');
  // Largest intermediate is < 2^53; every integer operation is exact.
  return BigInt((Number(value) * 1664525 + Number(bias)) % 1000003);
}

// Host ordering is part of the contract: await fetch -> compute -> publish.
// The closure's captured bias and lexical scope can be specialized at setup.
export async function processJobs(jobs, bias, host, score = scoreNumber) {
  const outputs = new Array(jobs.length);
  for (let i = 0; i < jobs.length; i++) {
    const id = jobs[i], payload = await host.fetch(id);
    const result = new Integer(score(payload.value, bias.value));
    host.publish(id, result);
    outputs[i] = result;
  }
  return outputs;
}
