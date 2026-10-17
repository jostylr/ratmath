import assert from 'node:assert/strict';

function mod(n, p) { const value = n % p; return value < 0n ? value + p : value; }
function inverse(n, p) {
  let a = mod(n, p), b = p, x = 1n, y = 0n;
  while (b) { const q = a / b; [a, b] = [b, a % b]; [x, y] = [y, x - q * y]; }
  if (a !== 1n) throw new Error('Projection denominator is not invertible');
  return mod(x, p);
}
// Two deterministic modular projection checks, not a proof of every exact output.
// This avoids performing a second cubic computation in JS for the massive demo.
export function checkMatrixProjections(job, outputs) {
  assert.equal(outputs.length, job.rows * job.cols);
  const checks = [];
  for (const p of [1000000007n, 1000000009n]) {
    const denominatorCache = new Map();
    const numeric = (value) => {
      const d = value.denominator;
      if (!denominatorCache.has(d)) denominatorCache.set(d, inverse(d, p));
      return mod(mod(value.numerator, p) * denominatorCache.get(d), p);
    };
    const a = job.left.map(numeric), b = job.right.map(numeric), c = outputs.map(numeric);
    const vector = Array.from({ length: job.cols }, (_, i) => mod(BigInt(i + 1) * BigInt(i + 17) + 42n, p));
    const br = Array.from({ length: job.inner }, (_, k) => {
      let total = 0n;
      for (let j = 0; j < job.cols; j++) total += b[k * job.cols + j] * vector[j];
      return mod(total, p);
    });
    for (let i = 0; i < job.rows; i++) {
      let left = 0n, right = 0n;
      for (let k = 0; k < job.inner; k++) left += a[i * job.inner + k] * br[k];
      for (let j = 0; j < job.cols; j++) right += c[i * job.cols + j] * vector[j];
      assert.equal(mod(left, p), mod(right, p), `Projection mismatch, row ${i}, modulus ${p}`);
    }
    checks.push({ modulus: p.toString(), rowsChecked: job.rows });
  }
  return checks;
}
