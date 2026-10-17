// Generated from RiX IR; source SHA256 1d621e20d5d3bb6f0ee0be70a0f53506100805a80a3b26bcf4e4dccd2582a142
// Exact BigInt specialization; peepholes=true. No interpreter calls.
export const sourceHash = "1d621e20d5d3bb6f0ee0be70a0f53506100805a80a3b26bcf4e4dccd2582a142";

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

// RiX function "INVERSE"
function v8(v9, v10) {
  return (() => {
    let v11 = (1n & (pow2(v10) - 1n)); // "inverse"
    let v12 = 1n; // "size"
    let v13 = 0;
    while ((v12 < v10)) {
      if (v13++ >= 10000) throw new Error('Loop exceeded max iteration count: 10000');
      v12 = (((v12 * 2n) < v10) ? (v12 * 2n) : v10);
      v11 = ((v11 * (2n - (v9 * v11))) & (pow2(v12) - 1n));
    }
    return v11;
  })();
}

// RiX function "BITS"
function v18(v19) {
  return (() => {
    // "e" aliases "exponent"
    let v20 = [0n]; // "bits"
    let v21 = 0;
    while ((v19 > 0n)) {
      if (v21++ >= 10000) throw new Error('Loop exceeded max iteration count: 10000');
      v20 = append(v20, (v19 & 1n));
      v19 = (v19 >> 1n);
    }
    return sliceFrom(v20, 2n).slice().reverse();
  })();
}

// RiX function "WINDOWEND"
function v27(v28, v29, v30) {
  return (() => {
    let v31 = (0n + ((((v29 + v30) - 1n) < BigInt(v28.length)) ? ((v29 + v30) - 1n) : BigInt(v28.length))); // "j"
    let v32 = 0;
    while ((getAt(v28, v31) === 0n)) {
      if (v32++ >= 10000) throw new Error('Loop exceeded max iteration count: 10000');
      v31 = (v31 - 1n);
    }
    return v31;
  })();
}

// RiX function "WINDOWWORD"
function v33(v34, v35, v36) {
  return (() => {
    let v37 = (0n + v35); // "j"
    let v38 = 0n; // "word"
    let v39 = 0;
    while ((v37 <= v36)) {
      if (v39++ >= 10000) throw new Error('Loop exceeded max iteration count: 10000');
      v38 = ((v38 * 2n) + getAt(v34, v37));
      v37 = (v37 + 1n);
    }
    return v38;
  })();
}

// RiX function "SCHEDULE"
function v15(v16, v17) {
  return (() => {
    let v22 = v18(v16); // "bits"
    let v23 = [[(0n - 0n), (0n - 0n)]]; // "steps"
    let v24 = (1n - 0n); // "i"
    let v25 = (0n - 0n); // "end"
    let v26 = 0n; // "word"
    let v40 = 0;
    while ((v24 <= BigInt(v22.length))) {
      if (v40++ >= 10000) throw new Error('Loop exceeded max iteration count: 10000');
      v25 = ((getAt(v22, v24) === 0n) ? v24 : v27(v22, v24, v17));
      v26 = ((getAt(v22, v24) === 0n) ? 0n : v33(v22, v24, v25));
      v23 = append(v23, [((v25 - v24) + 1n), v26]);
      v24 = (v25 + 1n);
    }
    return sliceFrom(v23, 2n);
  })();
}

// RiX function "MONTMUL"
function v59(v60, v61, v62, v63, v64, v65) {
  return (() => {
    let v66 = (v60 * v61); // "product"
    let v67 = (((v66 & (v63 - 1n)) * v65) & (v63 - 1n)); // "correction"
    let v68 = ((v66 + (v67 * v62)) >> v64); // "reduced"
    return ((v68 >= v62) ? (v68 - v62) : v68);
  })();
}

// RiX function "ODDPOWERS"
function v51(v52, v53, v54, v55, v56, v57) {
  return (() => {
    let v58 = (((v52 % v53) * v54) % v53); // "b"
    let v69 = v59(v58, v58, v53, v54, v55, v56); // "squared"
    let v70 = [v58]; // "odd"
    let v71 = (pow2(v57) >> 1n); // "count"
    let v72 = 1n; // "i"
    let v73 = 0;
    while ((v72 < v71)) {
      if (v73++ >= 10000) throw new Error('Loop exceeded max iteration count: 10000');
      v70 = append(v70, v59(last(v70), v69, v53, v54, v55, v56));
      v72 = (v72 + 1n);
    }
    return v70;
  })();
}

// RiX function "SQUARES"
function v85(v86, v87, v88, v89, v90, v91) {
  return (() => {
    let v92 = (0n + v86); // "r"
    let v93 = 0n; // "i"
    let v94 = 0;
    while ((v93 < v87)) {
      if (v94++ >= 10000) throw new Error('Loop exceeded max iteration count: 10000');
      v92 = v59(v92, v92, v88, v89, v90, v91);
      v93 = (v93 + 1n);
    }
    return v92;
  })();
}

// RiX function "WINDOWSTEP"
function v77(v78, v79, v80, v81, v82, v83, v84) {
  return (() => {
    let v95 = v85(v78, getAt(v80, 1n), v81, v82, v83, v84); // "r"
    let v96 = getAt(v80, 2n); // "word"
    return ((v96 > 0n) ? v59(v95, getAt(v79, (floorDiv((v96 - 1n), 2n) + 1n)), v81, v82, v83, v84) : v95);
  })();
}

// RiX function "MONTMUL"
function v98(v99, v100, v101, v102, v103, v104) {
  return (() => {
    let v105 = (v99 * v100); // "product"
    let v106 = (((v105 & (v102 - 1n)) * v104) & (v102 - 1n)); // "correction"
    let v107 = ((v105 + (v106 * v101)) >> v103); // "reduced"
    return ((v107 >= v101) ? (v107 - v101) : v107);
  })();
}

// RiX function "MONTPOWER"
function v43(v44, v45, v46, v47, v48, v49, v50) {
  return (() => {
    let v74 = v51(v44, v45, v46, v47, v48, v50); // "odd"
    let v97 = v49.reduce((v75, v76) => v77(v75, v74, v76, v45, v46, v47, v48), (v46 % v45)); // "value"
    return v98(v97, 1n, v45, v46, v47, v48);
  })();
}

// RiX function "RUN"
function v0(v1, v2, v3) {
  return (() => {
    let v4 = 5n; // "width"
    let v5 = bitLength(v3); // "bits"
    let v7 = v5;
    let v6 = pow2(v5); // "radix"
    let v14 = ((0n - v8(v3, v5)) & (v6 - 1n)); // "factor"
    let v41 = v15(v2, v4); // "steps"
    return v1.map((v42) => v43(v42, v3, v6, v7, v14, v41, v4));
  })();
}

export function run(bases, exponent, modulus) {
  validateInputs(bases, exponent, modulus);
  if ((modulus & 1n) === 0n) throw new RangeError('Montgomery specialization requires an odd modulus');
  return v0(bases, exponent, modulus);
}
