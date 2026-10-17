import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const root = process.env.RATMATH_ROOT || resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const rix = await import(pathToFileURL(resolve(root, 'rix/src/index.js')).href);
// Resolve core from RiX, rather than accidentally loading a second class identity.
const { createRequire } = await import('node:module');
const requireFromRix = createRequire(resolve(root, 'rix/package.json'));
export const core = await import(pathToFileURL(requireFromRix.resolve('@ratmath/core')).href);
export const { Integer, Rational, RationalInterval } = core;
export const registry = rix.createDefaultRegistry();
export const systemContext = rix.createDefaultSystemContext();
export const parseIR = (source) => {
  const nodes = rix.lower(rix.parse(rix.tokenize(source)));
  if (nodes.length !== 1) throw new Error('Expected one expression');
  return nodes[0];
};
