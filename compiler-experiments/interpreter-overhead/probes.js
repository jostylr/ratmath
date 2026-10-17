// Diagnostic copies only. Never imported by timed benchmark variants.
let active = false, counts = {}, rationalCopyBits = { maxNumerator:0, maxDenominator:0 };
export function reset() { active=true; counts={}; rationalCopyBits={maxNumerator:0,maxDenominator:0}; }
export function stop() { active=false; return {counts:{...counts},rationalCopyBits:{...rationalCopyBits}}; }
export function inc(name) { if(active) counts[name]=(counts[name]||0)+1; }
export function copy(kind,value) {
  if(!active) return;
  inc(`copy.${kind}.${value?.constructor?.name||typeof value}`);
  if(value?.constructor?.name==='Rational') {
    const bits=n=>(n<0n?-n:n).toString(2).length;
    rationalCopyBits.maxNumerator=Math.max(rationalCopyBits.maxNumerator,bits(value.numerator));
    rationalCopyBits.maxDenominator=Math.max(rationalCopyBits.maxDenominator,bits(value.denominator));
  }
}
