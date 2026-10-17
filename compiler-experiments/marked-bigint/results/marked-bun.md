# Marked RiX compilation — bun

window, 24 powers, 2048-bit modulus, 1024-bit exponent; 5 measured rounds and 2 warmups.

| Path | Median ms | Min–max ms | Speedup vs interpretation |
|---|---:|---:|---:|
| interpreted marked RiX (ordinary interpreter) | 1433.589 | 1377.883–1497.971 | 1.00× |
| marked RiX, cached compilation | 27.032 | 26.875–28.173 | 53.03× |
| earlier direct BigInt AOT | 25.797 | 25.478–26.490 | 55.57× |
| handwritten BigInt JS | 24.646 | 23.714–32.263 | 58.17× |
| native C/GMP powm | 22.257 | 21.893–23.882 | 64.41× |

First marked use: 30.461 ms, including 1.185 ms compiling and creating the function. Builds=1; compiled calls=8; cache hits=7; fallbacks=0.

Every result is checked outside timing. Parsing, initialization and native preparation are excluded. Marked calls include normal RiX argument/scope binding, input guards, current dependency fingerprints, cache lookup and exact output boxing. All kernel setup remains timed. Native uses GMP powm; direct AOT uses the earlier compiler snapshot.
