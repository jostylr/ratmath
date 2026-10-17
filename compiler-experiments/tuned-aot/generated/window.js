// Generated from RiX IR; source SHA256 f01451f169d22b95103c2832ec0e462e4d9e60e5bd731a782c35483b3435c45c
// Exact BigInt specialization; peepholes=true. No interpreter calls.
export const sourceHash = "f01451f169d22b95103c2832ec0e462e4d9e60e5bd731a782c35483b3435c45c";

export function validateInputs(bases, exponent, modulus) {
  if (!Array.isArray(bases) || !bases.length || bases.length > 4096 ||
      Array.from(bases).some(b => typeof b !== 'bigint' || b < 0n || b.toString(2).length > 8192) ||
      typeof exponent !== 'bigint' || exponent < 0n || exponent.toString(2).length > 4096 ||
      typeof modulus !== 'bigint' || modulus < 1n || modulus.toString(2).length > 8192)
    throw new RangeError('Nonnegative bounded BigInt bases/exponent and positive modulus required');
}
function pow2(e) { if (e < 0n || e > 16384n) throw new RangeError('Power-of-two exponent outside specialization budget'); return 1n << e; }
function bitLength(n) { return n === 0n ? 0n : BigInt((n < 0n ? -n : n).toString(2).length); }
function getAt(a, i) { const j = i < 0n ? BigInt(a.length) + i : i - 1n; if (j < 0n || j >= BigInt(a.length)) throw new RangeError('Specialization requires an in-range sequence read'); return a[Number(j)]; }
function last(a) { if (!a.length) throw new RangeError('Specialization requires a nonempty Last receiver'); return a[a.length - 1]; }
function sliceFrom(a, i) { const j = i < 0n ? BigInt(a.length) + i : i - 1n; return a.slice(Number(j < 0n ? 0n : j > BigInt(a.length) ? BigInt(a.length) : j)); }
function append(a, value) { if (a.length >= 16384) throw new RangeError('Sequence specialization budget exceeded'); const copy = a.slice(); copy.push(value); return copy; }
function floorDiv(a, b) {
  const q = a / b, r = a % b;
  return r !== 0n && ((a < 0n) !== (b < 0n)) ? q - 1n : q;
}
function floorMod(a, b) {
  if (b <= 0n) throw new RangeError('Modulo requires a positive divisor');
  const r = a % b; return r < 0n ? r + b : r;
}

// RiX function "BITS"
function v8(v9) {
  return (() => {
    // "e" aliases "exponent"
    let v10 = [0n]; // "bits"
    let v11 = 0;
    while ((v9 > 0n)) {
      if (v11++ >= 10000) throw new Error('Loop exceeded max iteration count: 10000');
      v10 = append(v10, (v9 & 1n));
      v9 = (v9 >> 1n);
    }
    return sliceFrom(v10, 2n).slice().reverse();
  })();
}

// RiX function "WINDOWEND"
function v17(v18, v19, v20) {
  return (() => {
    let v21 = (0n + ((((v19 + v20) - 1n) < BigInt(v18.length)) ? ((v19 + v20) - 1n) : BigInt(v18.length))); // "j"
    let v22 = 0;
    while ((getAt(v18, v21) === 0n)) {
      if (v22++ >= 10000) throw new Error('Loop exceeded max iteration count: 10000');
      v21 = (v21 - 1n);
    }
    return v21;
  })();
}

// RiX function "WINDOWWORD"
function v23(v24, v25, v26) {
  return (() => {
    let v27 = (0n + v25); // "j"
    let v28 = 0n; // "word"
    let v29 = 0;
    while ((v27 <= v26)) {
      if (v29++ >= 10000) throw new Error('Loop exceeded max iteration count: 10000');
      v28 = ((v28 * 2n) + getAt(v24, v27));
      v27 = (v27 + 1n);
    }
    return v28;
  })();
}

// RiX function "SCHEDULE"
function v5(v6, v7) {
  return (() => {
    let v12 = v8(v6); // "bits"
    let v13 = [[(0n - 0n), (0n - 0n)]]; // "steps"
    let v14 = (1n - 0n); // "i"
    let v15 = (0n - 0n); // "end"
    let v16 = 0n; // "word"
    let v30 = 0;
    while ((v14 <= BigInt(v12.length))) {
      if (v30++ >= 10000) throw new Error('Loop exceeded max iteration count: 10000');
      v15 = ((getAt(v12, v14) === 0n) ? v14 : v17(v12, v14, v7));
      v16 = ((getAt(v12, v14) === 0n) ? 0n : v23(v12, v14, v15));
      v13 = append(v13, [((v15 - v14) + 1n), v16]);
      v14 = (v15 + 1n);
    }
    return sliceFrom(v13, 2n);
  })();
}

// RiX function "ODDPOWERS"
function v38(v39, v40, v41) {
  return (() => {
    let v42 = (v39 % v40); // "b"
    let v43 = ((v42 * v42) % v40); // "squared"
    let v44 = [v42]; // "odd"
    let v45 = (pow2(v41) >> 1n); // "count"
    let v46 = 1n; // "i"
    let v47 = 0;
    while ((v46 < v45)) {
      if (v47++ >= 10000) throw new Error('Loop exceeded max iteration count: 10000');
      v44 = append(v44, ((last(v44) * v43) % v40));
      v46 = (v46 + 1n);
    }
    return v44;
  })();
}

// RiX function "SQUARES"
function v56(v57, v58, v59) {
  return (() => {
    let v60 = (0n + v57); // "r"
    let v61 = 0n; // "i"
    let v62 = 0;
    while ((v61 < v58)) {
      if (v62++ >= 10000) throw new Error('Loop exceeded max iteration count: 10000');
      v60 = ((v60 * v60) % v59);
      v61 = (v61 + 1n);
    }
    return v60;
  })();
}

// RiX function "WINDOWSTEP"
function v51(v52, v53, v54, v55) {
  return (() => {
    let v63 = v56(v52, getAt(v54, 1n), v55); // "r"
    let v64 = getAt(v54, 2n); // "word"
    return ((v64 > 0n) ? ((v63 * getAt(v53, (floorDiv((v64 - 1n), 2n) + 1n))) % v55) : v63);
  })();
}

// RiX function "WINDOWPOWER"
function v33(v34, v35, v36, v37) {
  return (() => {
    let v48 = v38(v34, v35, v37); // "odd"
    return v36.reduce((v49, v50) => v51(v49, v48, v50, v35), (1n % v35));
  })();
}

// RiX function "RUN"
function v0(v1, v2, v3) {
  return (() => {
    let v4 = 6n; // "width"
    let v31 = v5(v2, v4); // "steps"
    return v1.map((v32) => v33(v32, v3, v31, v4));
  })();
}

export function run(bases, exponent, modulus) {
  validateInputs(bases, exponent, modulus);
  
  return v0(bases, exponent, modulus);
}
