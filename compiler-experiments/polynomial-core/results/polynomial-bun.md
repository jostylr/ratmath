# Combined polynomial operations in fast core — bun

7 rounds, 2 warmups. Milliseconds per full point batch; all paths use the same copied fast core.

## integer-horner

Degree 32, 32 points.

| Path | Median ms | Speedup vs RiX Horner |
|---|---:|---:|
| RiX Horner, fast core | 3.1292 | 1.00× |
| JS Horner, same methods | 0.0384 | 81.40× |
| RiX combined per point | 0.0610 | 51.33× |
| RiX fused per point | 0.0573 | 54.58× |
| RiX combined batch | 0.0393 | 79.64× |
| RiX fused batch | 0.0347 | 90.09× |
| JS fused batch | 0.0337 | 92.72× |

## rational-horner

Degree 16, 16 points.

| Path | Median ms | Speedup vs RiX Horner |
|---|---:|---:|
| RiX Horner, fast core | 3.1874 | 1.00× |
| JS Horner, same methods | 0.2448 | 13.02× |
| RiX combined per point | 0.2707 | 11.78× |
| RiX fused per point | 0.2423 | 13.15× |
| RiX combined batch | 0.2451 | 13.00× |
| RiX fused batch | 0.2237 | 14.25× |
| JS fused batch | 0.2236 | 14.25× |

## rational-coefficients-horner

Degree 16, 16 points.

| Path | Median ms | Speedup vs RiX Horner |
|---|---:|---:|
| RiX Horner, fast core | 3.4903 | 1.00× |
| JS Horner, same methods | 0.2956 | 11.81× |
| RiX combined per point | 0.3194 | 10.93× |
| RiX fused per point | 0.2974 | 11.74× |
| RiX combined batch | 0.2990 | 11.67× |
| RiX fused batch | 0.2822 | 12.37× |
| JS fused batch | 0.2659 | 13.12× |

## larger-rational-horner

Degree 32, 8 points.

| Path | Median ms | Speedup vs RiX Horner |
|---|---:|---:|
| RiX Horner, fast core | 16.7375 | 1.00× |
| JS Horner, same methods | 0.7282 | 22.98× |
| RiX combined per point | 0.7429 | 22.53× |
| RiX fused per point | 0.7050 | 23.74× |
| RiX combined batch | 0.7255 | 23.07× |
| RiX fused batch | 0.7084 | 23.63× |
| JS fused batch | 0.7065 | 23.69× |

## zero-rational-horner

Degree 128, 4 points.

| Path | Median ms | Speedup vs RiX Horner |
|---|---:|---:|
| RiX Horner, fast core | 1.6639 | 1.00× |
| JS Horner, same methods | 0.0628 | 26.49× |
| RiX combined per point | 0.0682 | 24.38× |
| RiX fused per point | 0.0249 | 66.72× |
| RiX combined batch | 0.0627 | 26.55× |
| RiX fused batch | 0.0205 | 81.23× |
| JS fused batch | 0.0196 | 85.09× |

## interval-horner

Degree 8, 8 points.

| Path | Median ms | Speedup vs RiX Horner |
|---|---:|---:|
| RiX Horner, fast core | 0.3619 | 1.00× |
| JS Horner, same methods | 0.0726 | 4.98× |
| RiX combined per point | 0.0836 | 4.33× |
| RiX fused per point | 0.0838 | 4.32× |
| RiX combined batch | 0.0734 | 4.93× |
| RiX fused batch | 0.0756 | 4.79× |
| JS fused batch | 0.0722 | 5.01× |

## rational-coefficients-integer-points

Degree 16, 32 points.

| Path | Median ms | Speedup vs RiX Horner |
|---|---:|---:|
| RiX Horner, fast core | 1.9063 | 1.00× |
| JS Horner, same methods | 0.1711 | 11.14× |
| RiX combined per point | 0.1959 | 9.73× |
| RiX fused per point | 0.1582 | 12.05× |
| RiX combined batch | 0.1723 | 11.07× |
| RiX fused batch | 0.1385 | 13.76× |
| JS fused batch | 0.1396 | 13.65× |

## constant-rational-polynomial

Degree 0, 16 points.

| Path | Median ms | Speedup vs RiX Horner |
|---|---:|---:|
| RiX Horner, fast core | 0.1030 | 1.00× |
| JS Horner, same methods | 0.0024 | 43.35× |
| RiX combined per point | 0.0125 | 8.22× |
| RiX fused per point | 0.0117 | 8.80× |
| RiX combined batch | 0.0029 | 35.13× |
| RiX fused batch | 0.0022 | 47.57× |
| JS fused batch | 0.0018 | 58.12× |

Combined method paths remove interpreter work inside Horner. Fused paths additionally remove intermediate Integer/Rational wrappers while using the same stepwise reduced multiply/add kernel. Batch paths remove per-point RiX traversal/calls. JS paths expose the remaining host-boundary overhead. There is no changed polynomial algorithm, delayed fraction normalization, leading-zero pruning, compilation, native code or cached preparation.
