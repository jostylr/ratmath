// Inputs to these internal kernels must be canonical rational pairs with d>0.
// Outputs are reduced by proof; there is no public 'trust arbitrary fractions' API.
export const abs = n => n < 0n ? -n : n;
export function gcd(a, b) {
  a = abs(a); b = abs(b);
  if (a === 0n) return b;
  if (b === 1n) return 1n;
  while (b) { const r = a % b; a = b; b = r; }
  return a;
}
export function reduced(op, a, b, c, d) {
  if (op === 'add' || op === 'subtract') {
    if (op === 'subtract') c = -c;
    if (d === 1n) return [a + c * b, b];
    if (b === 1n) return [a * d + c, d];
    if (b === d) {
      const n = a + c, g = gcd(n, b);
      return [n / g, b / g];
    }
    const g = gcd(b, d), bb = b / g, dd = d / g;
    const n = a * dd + c * bb;
    const h = g === 1n ? 1n : gcd(n, g);
    return [n / h, bb * (d / h)];
  }
  if (op === 'multiply') {
    if (a === 0n || c === 0n) return [0n, 1n];
    const g = gcd(a, d), h = gcd(c, b);
    return [(a / g) * (c / h), (b / h) * (d / g)];
  }
  if (op === 'divide') {
    if (c === 0n) throw new Error('Division by zero');
    if (a === 0n) return [0n, 1n];
    const g = gcd(a, c), h = gcd(b, d);
    let n = (a / g) * (d / h), den = (b / h) * (c / g);
    if (den < 0n) { n = -n; den = -den; }
    return [n, den];
  }
  throw new Error(`Unsupported operation ${op}`);
}
