import { cp, readFile, writeFile, mkdir, readdir, symlink, rm } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
export const here = dirname(fileURLToPath(import.meta.url));
export const root = process.env.RATMATH_ROOT || resolve(here, '../..');
export const variants = ['baseline', 'candidate', 'candidate-wired'];
const sha = value => createHash('sha256').update(value).digest('hex');
async function inventory(folder, base = folder) {
  const entries = [];
  for (const item of await readdir(folder, { withFileTypes: true })) {
    const path = resolve(folder, item.name);
    if (item.isDirectory()) entries.push(...Object.entries(await inventory(path, base)));
    else if (item.isFile()) entries.push([relative(base, path), sha(await readFile(path))]);
  }
  return Object.fromEntries(entries);
}
export async function build() {
  const original = { core: await inventory(resolve(root, 'packages/core/src')), coreTests: await inventory(resolve(root, 'packages/core/tests')), rix: await inventory(resolve(root, 'rix/src')), plugins: await inventory(resolve(root, 'rix/plugins')) };
  const reduced = await readFile(resolve(root, 'compiler-experiments/core-arithmetic/reduced.js'), 'utf8');
  const paths = {};
  for (const variant of variants) {
    const env = resolve(here, 'tmp', variant), core = resolve(env, 'packages/core'), rix = resolve(env, 'rix');
    await rm(env, { recursive: true, force: true });
    await mkdir(core, { recursive: true }); await mkdir(rix, { recursive: true });
    for (const name of ['src', 'tests', 'index.js', 'index.d.ts', 'package.json']) await cp(resolve(root, 'packages/core', name), resolve(core, name), { recursive: true });
    for (const name of ['src', 'tests', 'bin', 'plugins', 'package.json']) await cp(resolve(root, 'rix', name), resolve(rix, name), { recursive: true });
    await mkdir(resolve(env, 'node_modules/@ratmath'), { recursive: true });
    await symlink('../../packages/core', resolve(env, 'node_modules/@ratmath/core'));
    for (const entry of await readdir(resolve(root, 'node_modules'), { withFileTypes: true })) {
      if (entry.name === '@ratmath' || entry.name === '.bin') continue;
      await symlink(resolve(root, 'node_modules', entry.name), resolve(env, 'node_modules', entry.name));
    }
    if (variant !== 'baseline') {
      await writeFile(resolve(core, 'src/experimental-reduced.js'), reduced + `
let integerPrototype;
export const installIntegerPrototype = prototype => { integerPrototype = prototype; };
export const isPlainInteger = value => value != null && Object.getPrototypeOf(value) === integerPrototype &&
  !Object.hasOwn(value, 'value') && !Object.hasOwn(value, 'constructor');
`);
      let source = await readFile(resolve(core, 'src/rational.js'), 'utf8');
      source = "import { reduced, isPlainInteger } from './experimental-reduced.js';\n" + source;
      const helper = `
  // Experiment only: private fields can be set only after proving reduction.
  static #fromReduced(n, d) {
    if (n === 0n) d = 1n;
    if (d < 0n) { n = -n; d = -d; }
    const result = new Rational(0n, 1n);
    result.#numerator = n; result.#denominator = d;
    result.#isNegative = n < 0n;
    return result;
  }
  static _canUseReduced(value) {
    return value != null && Object.getPrototypeOf(value) === Rational.prototype &&
      !Object.hasOwn(value, 'numerator') && !Object.hasOwn(value, 'denominator') && !Object.hasOwn(value, 'constructor');
  }
  static _integerLeft(op, value, other) {
    if (!isPlainInteger(value) || !Rational._canUseReduced(other)) throw new TypeError('Plain Integer/Rational operands required');
    const [n, d] = reduced(op, value.value, 1n, other.#numerator, other.#denominator);
    return Rational.#fromReduced(n, d);
  }
  #arithmeticFast(op, other) {
    const [c, d] = isPlainInteger(other) ? [other.value, 1n] : [other.#numerator, other.#denominator];
    const [n, den] = reduced(op, this.#numerator, this.#denominator, c, d);
    return Rational.#fromReduced(n, den);
  }
`;
      if (!source.includes('  #normalize() {')) throw new Error('Rational patch anchor changed');
      source = source.replace('  #normalize() {', helper + '\n  #normalize() {');
      for (const op of ['add', 'subtract', 'multiply', 'divide']) {
        const anchor = `  ${op}(other) {`;
        if (!source.includes(anchor)) throw new Error(`Rational ${op} anchor changed`);
        source = source.replace(anchor, anchor + `\n    if (other?.isCertifiedApproximation !== true && (Rational._canUseReduced(other) || isPlainInteger(other))) return this.#arithmeticFast('${op}', other);`);
      }
      await writeFile(resolve(core, 'src/rational.js'), source);
      let integer = await readFile(resolve(core, 'src/integer.js'), 'utf8');
      integer = "import { installIntegerPrototype, isPlainInteger } from './experimental-reduced.js';\n" + integer;
      for (const op of ['add', 'subtract', 'multiply', 'divide']) {
        const start = integer.indexOf(`  ${op}(other) {`), end = integer.indexOf('\n  /**', start + 1);
        const body = integer.slice(start, end), anchor = '} else if (other instanceof Rational) {';
        if (!body.includes(anchor)) throw new Error(`Integer ${op} anchor changed`);
        integer = integer.slice(0, start) + body.replace(anchor, anchor + `\n      if (isPlainInteger(this) && Rational._canUseReduced(other)) return Rational._integerLeft('${op}', this, other);`) + integer.slice(end);
      }
      const floor = `
  // New experiment-only APIs; existing divide/modulo semantics are unchanged.
  floorDivide(other) {
    if (!isPlainInteger(this) || !isPlainInteger(other)) throw new TypeError('Plain Integers required');
    if (other.value === 0n) throw new Error('Division by zero');
    const a = this.#value, b = other.value, q = a / b, r = a % b;
    return new Integer(r !== 0n && ((a < 0n) !== (b < 0n)) ? q - 1n : q);
  }
  floorModulo(other) {
    if (!isPlainInteger(this) || !isPlainInteger(other)) throw new TypeError('Plain Integers required');
    if (other.value <= 0n) throw new Error('Modulo divisor must be positive');
    const r = this.#value % other.value;
    return new Integer(r < 0n ? r + other.value : r);
  }
  divmod(other) {
    if (!isPlainInteger(this) || !isPlainInteger(other)) throw new TypeError('Plain Integers required');
    if (other.value <= 0n) throw new Error('Division with remainder divisor must be positive');
    const a = this.#value, b = other.value, q = a / b, r = a % b;
    return [new Integer(r < 0n ? q - 1n : q), new Integer(r < 0n ? r + b : r)];
  }
`;
      integer = integer.replace('  modulo(other) {', floor + '\n  modulo(other) {');
      integer += '\ninstallIntegerPrototype(Integer.prototype);\n';
      await writeFile(resolve(core, 'src/integer.js'), integer);
    }
    if (variant === 'candidate-wired') {
      const path = resolve(rix, 'src/eval/functions/arithmetic.js');
      let source = await readFile(path, 'utf8');
      for (const [name, line] of [['INTDIV', "if (plainInteger(a) && plainInteger(b)) return a.floorDivide(b);"], ['MOD', "if (plainInteger(a) && plainInteger(b)) return a.floorModulo(b);"], ['DIVMOD', "if (plainInteger(a) && plainInteger(b)) return { type: 'tuple', values: a.divmod(b) };" ]]) {
        const start = source.indexOf(`    ${name}: {`), anchor = '            const b = ensureNumeric(args[1]);';
        const index = source.indexOf(anchor, start);
        if (start < 0 || index < 0) throw new Error(`RiX ${name} patch anchor changed`);
        source = source.slice(0, index) + source.slice(index).replace(anchor, anchor + '\n            ' + line);
      }
      source += "\n// Experiment-only adapter to explicit core floor APIs.\nfunction plainInteger(value) { return value instanceof Integer && Object.getPrototypeOf(value) === Integer.prototype && !Object.hasOwn(value, 'value'); }\n";
      await writeFile(path, source);
    }
    paths[variant] = { core, rix, coreSource: await inventory(resolve(core, 'src')), rixSource: await inventory(resolve(rix, 'src')) };
  }
  const manifest = { sourceRoot: root, original, paths, changes: { candidateCore: ['Rational private canonical-result factory and four proof-based arithmetic paths', 'Guarded mixed Integer-left arithmetic', 'New Integer floorDivide/floorModulo/divmod; existing exact divide/remainder retained'], candidateRiX: 'Unchanged', wiredRiX: 'Only INTDIV/MOD/DIVMOD delegate plain Integer operands to the new methods' } };
  await writeFile(resolve(here, 'tmp/build.json'), JSON.stringify(manifest, null, 2) + '\n');
  await mkdir(resolve(here, 'results'), { recursive: true });
  await writeFile(resolve(here, 'results/build-provenance.json'), JSON.stringify({ original, changes: manifest.changes, patched: Object.fromEntries(Object.entries(paths).map(([v, p]) => [v, { coreSource: p.coreSource, rixSource: p.rixSource }])) }, null, 2) + '\n');
  console.log('Built three independent package trees. Production package links and sources were not changed.');
  return manifest;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await build();
