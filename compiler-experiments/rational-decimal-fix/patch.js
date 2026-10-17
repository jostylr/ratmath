import assert from 'node:assert/strict';
export const before = '            const wholePart = BigInt(integerPart);';
export const after = `            // A signed leading decimal has an implicit zero whole part.
            const wholePart = integerPart === "-" && fractionalPart.length > 0
              ? 0n
              : BigInt(integerPart);`;
export function patch(source) {
  if (source.includes(after)) return source;
  assert.equal(source.split(before).length, 2, 'Expected one decimal conversion');
  return source.replace(before, after);
}
