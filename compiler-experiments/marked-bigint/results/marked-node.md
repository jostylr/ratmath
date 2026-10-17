# Marked RiX compilation — node

montgomery, 24 powers, 2048-bit modulus, 1024-bit exponent; 5 measured rounds and 2 warmups.

| Path | Median ms | Min–max ms | Speedup vs interpretation |
|---|---:|---:|---:|
| interpreted marked RiX (ordinary interpreter) | 7902.501 | 7876.645–8017.680 | 1.00× |
| marked RiX, cached compilation | 43.397 | 42.955–43.924 | 182.10× |
| earlier direct BigInt AOT | 42.931 | 42.450–43.193 | 184.07× |
| handwritten BigInt JS | 40.422 | 39.989–41.203 | 195.50× |
| native C/GMP powm | 15.630 | 15.512–15.722 | 505.60× |

First marked use: 48.672 ms, including 1.695 ms compiling and creating the function. Builds=1; compiled calls=8; cache hits=7; fallbacks=0.

Every result is checked outside timing. Parsing, initialization and native preparation are excluded. Marked calls include normal RiX argument/scope binding, input guards, current dependency fingerprints, cache lookup and exact output boxing. All kernel setup remains timed. Native uses GMP powm; direct AOT uses the earlier compiler snapshot.
