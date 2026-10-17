# Direct BigInt compilation — bun

24 powers; 2048-bit modulus; 1024-bit exponent. 9 rounds, 3 warmups.

| Path | Median ms | Min–max ms | Speedup vs RiX | Relative to tuned JS |
|---|---:|---:|---:|---:|
| interpreted RiX | 1588.703 | 1560.753–1628.606 | 1.00× | 68.26× time |
| compiled BigInt | 31.503 | 30.985–32.078 | 50.43× | 1.35× time |
| compiled BigInt + peepholes | 30.060 | 29.926–30.881 | 52.85× | 1.29× time |
| handwritten binary | 30.113 | 29.815–31.064 | 52.76× | 1.29× time |
| hand-tuned window-6 | 23.275 | 22.864–23.805 | 68.26× | 1.00× time |
| compiled raw diagnostic | 30.184 | 29.649–31.015 | 52.63× | 1.30× time |

Compilation including parsing: 1.087 / 0.376 ms (plain / peepholes). Module import: 0.455 / 0.185 ms.

Input conversion, guards, output boxing and whole-batch computation are timed. Every warmup, tuning run and timed result is checked outside its timing. Raw diagnostic omits boundary conversion/boxing. See README for scope and caveats.
