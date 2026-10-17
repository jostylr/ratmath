// Dependency-free encoder for the same tiny integer expression subset.
// i32 arithmetic wraps. Callers MUST establish bounds before using this backend.
const uleb = (n) => {
  const out = [];
  do { const b = n & 127; n >>>= 7; out.push(b | (n ? 128 : 0)); } while (n);
  return out;
};
const sleb = (n) => {
  const out = [];
  while (true) {
    let b = n & 127; n >>= 7;
    const done = (n === 0 && !(b & 64)) || (n === -1 && (b & 64));
    out.push(b | (done ? 0 : 128));
    if (done) return out;
  }
};
const section = (id, bytes) => [id, ...uleb(bytes.length), ...bytes];
const name = (s) => [...uleb(s.length), ...new TextEncoder().encode(s)];

export function compileI32(node, capacity = 1024) {
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 8192) throw new RangeError('Capacity 1..8192');
  function emit(n) {
    if (n.fn === 'RETRIEVE' && n.args.length === 1 && n.args[0] === 'x') return [0x20, 0];
    if (n.fn === 'LITERAL' && n.args.length === 1 && /^-?\d+$/.test(n.args[0])) {
      const value = Number(n.args[0]);
      if (!Number.isInteger(value) || value < -2147483648 || value > 2147483647) throw new RangeError('i32 literal');
      return [0x41, ...sleb(value)];
    }
    const opcode = { ADD: 0x6a, SUB: 0x6b, MUL: 0x6c }[n.fn];
    if (!opcode || n.args.length !== 2) throw new Error(`Unsupported Wasm IR ${n.fn}`);
    return [...emit(n.args[0]), ...emit(n.args[1]), opcode];
  }
  const kernel = [0, ...emit(node), 0x0b];
  const outputOffset = capacity * 4;
  // batch(count): read preloaded i32 inputs, call kernel, write i32 outputs.
  const batch = [1, 1, 0x7f,
    0x02, 0x40, 0x03, 0x40,
    0x20, 1, 0x20, 0, 0x4f, 0x0d, 1,
    0x20, 1, 0x41, 4, 0x6c, 0x41, ...sleb(outputOffset), 0x6a,
    0x20, 1, 0x41, 4, 0x6c, 0x28, 2, 0, 0x10, 0, 0x36, 2, 0,
    0x20, 1, 0x41, 1, 0x6a, 0x21, 1,
    0x0c, 0, 0x0b, 0x0b, 0x0b];
  const bytes = new Uint8Array([
    0, 97, 115, 109, 1, 0, 0, 0,
    ...section(1, [2, 0x60, 1, 0x7f, 1, 0x7f, 0x60, 1, 0x7f, 0]),
    ...section(3, [2, 0, 1]),
    ...section(5, [1, 0, 1]),
    ...section(7, [3, ...name('kernel'), 0, 0, ...name('batch'), 0, 1, ...name('memory'), 2, 0]),
    ...section(10, [2, ...uleb(kernel.length), ...kernel, ...uleb(batch.length), ...batch]),
  ]);
  const instance = new WebAssembly.Instance(new WebAssembly.Module(bytes));
  return {
    bytes, kernel: instance.exports.kernel,
    inputs: new Int32Array(instance.exports.memory.buffer, 0, capacity),
    batch(count) {
      if (!Number.isInteger(count) || count < 0 || count > capacity) throw new RangeError('Batch exceeds capacity');
      instance.exports.batch(count);
      // Include output materialization, like the JS batch paths.
      return new Int32Array(instance.exports.memory.buffer, outputOffset, count).slice();
    },
  };
}
