// Generated from RiX IR; source SHA256 fb61a5da460e30a0680f7e580f2949c1a0572ebed11ef33c39843253d90ce794
// Exact BigInt specialization; peepholes=false. No interpreter calls.
export const sourceHash = "fb61a5da460e30a0680f7e580f2949c1a0572ebed11ef33c39843253d90ce794";

export function validateInputs(bases, exponent, modulus) {
  if (!Array.isArray(bases) || !bases.length || bases.length > 4096 ||
      Array.from(bases).some(b => typeof b !== 'bigint' || b < 0n || b.toString(2).length > 8192) ||
      typeof exponent !== 'bigint' || exponent < 0n || exponent.toString(2).length > 4096 ||
      typeof modulus !== 'bigint' || modulus < 1n || modulus.toString(2).length > 8192)
    throw new RangeError('Nonnegative bounded BigInt bases/exponent and positive modulus required');
}
function floorDiv(a, b) {
  const q = a / b, r = a % b;
  return r !== 0n && ((a < 0n) !== (b < 0n)) ? q - 1n : q;
}
function floorMod(a, b) {
  if (b <= 0n) throw new RangeError('Modulo requires a positive divisor');
  const r = a % b; return r < 0n ? r + b : r;
}

// RiX function "POWER"
function v5(v6, v7, v8) {
  return (() => {
    let v9 = v6; // import "base"
    let v10 = v7; // import "exponent"
    let v11 = v8; // import "modulus"
    let v12 = (v9 % v11); // "b"
    // "e" aliases "exponent"
    let v13 = (1n % v11); // "r"
    let v14 = 0;
    while ((v10 > 0n)) {
      if (v14++ >= 10000) throw new Error('Loop exceeded max iteration count: 10000');
      v13 = (((v10 % 2n) === 1n) ? ((v13 * v12) % v11) : v13);
      v12 = ((v12 * v12) % v11);
      v10 = (v10 / 2n);
    }
    return v13;
  })();
}

// RiX function "RUN"
function v0(v1, v2, v3) {
  return v1.map((v4) => v5(v4, v2, v3));
}

export function run(bases, exponent, modulus) {
  validateInputs(bases, exponent, modulus);
  return v0(bases, exponent, modulus);
}
