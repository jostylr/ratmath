# Combined polynomial operations — node

7 measured rounds, 2 warmups. Each row is ms per complete point batch.

## integer-degree32

Degree 32, 32 points.

| Path | Median ms | Speedup vs JS core Horner |
|---|---:|---:|
| JS power sum, core methods | 0.2786 | 0.10× |
| RiX power sum | 35.4638 | 0.00× |
| JS Horner, core methods | 0.0286 | 1.00× |
| RiX Horner | 3.0973 | 0.01× |
| JS Horner, public fast paths | 0.3315 | 0.09× |
| RiX Horner, public fast paths | 3.3330 | 0.01× |
| JS fused batch, prepare included | 0.0485 | 0.59× |
| JS fused batch, cached plan | 0.0445 | 0.64× |
| RiX offload each point | 0.1696 | 0.17× |
| RiX one batch capability | 0.0490 | 0.58× |
| RiX prepare plan + evaluate | 0.0495 | 0.58× |
| RiX cached plan evaluate | 0.0455 | 0.63× |
| RiX operation descriptor | 0.0553 | 0.52× |
| RiX marked BigInt Horner | 0.0711 | 0.40× |

## rational-degree16

Degree 16, 16 points.

| Path | Median ms | Speedup vs JS core Horner |
|---|---:|---:|
| JS power sum, core methods | 52.3860 | 0.21× |
| RiX power sum | 102.3287 | 0.11× |
| JS Horner, core methods | 11.2177 | 1.00× |
| RiX Horner | 18.1130 | 0.62× |
| JS Horner, public fast paths | 11.8076 | 0.95× |
| RiX Horner, public fast paths | 18.4757 | 0.61× |
| snapshot control Horner | 11.3241 | 0.99× |
| snapshot candidate Horner | 0.3042 | 36.88× |
| JS fused batch, prepare included | 0.7629 | 14.70× |
| JS fused batch, cached plan | 0.7560 | 14.84× |
| RiX offload each point | 0.8132 | 13.79× |
| RiX one batch capability | 0.7567 | 14.82× |
| RiX prepare plan + evaluate | 0.7545 | 14.87× |
| RiX cached plan evaluate | 0.7469 | 15.02× |
| RiX operation descriptor | 0.7658 | 14.65× |
| RiX marked Integer-pair Horner | 1.4640 | 7.66× |
| RiX Integer-pair Horner | 2.0442 | 5.49× |

## rational-coefficients-degree16

Degree 16, 16 points.

| Path | Median ms | Speedup vs JS core Horner |
|---|---:|---:|
| JS power sum, core methods | 51.2346 | 0.22× |
| RiX power sum | 101.9410 | 0.11× |
| JS Horner, core methods | 11.3177 | 1.00× |
| RiX Horner | 18.2098 | 0.62× |
| JS Horner, public fast paths | 11.7992 | 0.96× |
| RiX Horner, public fast paths | 18.5750 | 0.61× |
| snapshot control Horner | 11.3970 | 0.99× |
| snapshot candidate Horner | 0.3500 | 32.34× |
| JS fused batch, prepare included | 0.7595 | 14.90× |
| JS fused batch, cached plan | 0.7561 | 14.97× |
| RiX offload each point | 0.8258 | 13.71× |
| RiX one batch capability | 0.7595 | 14.90× |
| RiX prepare plan + evaluate | 0.7619 | 14.85× |
| RiX cached plan evaluate | 0.7471 | 15.15× |
| RiX operation descriptor | 0.7706 | 14.69× |

## zero-polynomial-degree128

Degree 128, 4 points.

| Path | Median ms | Speedup vs JS core Horner |
|---|---:|---:|
| JS Horner, core methods | 0.0556 | 1.00× |
| RiX Horner | 1.6018 | 0.03× |
| JS Horner, public fast paths | 0.2843 | 0.20× |
| RiX Horner, public fast paths | 1.8237 | 0.03× |
| snapshot control Horner | 0.0531 | 1.05× |
| snapshot candidate Horner | 0.0546 | 1.02× |
| JS fused batch, prepare included | 0.1053 | 0.53× |
| JS fused batch, cached plan | 0.0924 | 0.60× |
| RiX offload each point | 0.1474 | 0.38× |
| RiX one batch capability | 0.1034 | 0.54× |
| RiX prepare plan + evaluate | 0.1049 | 0.53× |
| RiX cached plan evaluate | 0.0927 | 0.60× |
| RiX operation descriptor | 0.1253 | 0.44× |
| RiX marked Integer-pair Horner | 0.2923 | 0.19× |
| RiX Integer-pair Horner | 2.0804 | 0.03× |
| JS cached plan, prune leading zeros | 0.0007 | 85.48× |

## cancellation-degree32

Degree 32, 4 points.

| Path | Median ms | Speedup vs JS core Horner |
|---|---:|---:|
| JS power sum, core methods | 0.1462 | 0.17× |
| RiX power sum | 4.8265 | 0.01× |
| JS Horner, core methods | 0.0247 | 1.00× |
| RiX Horner | 0.4376 | 0.06× |
| JS Horner, public fast paths | 0.0850 | 0.29× |
| RiX Horner, public fast paths | 0.4988 | 0.05× |
| snapshot control Horner | 0.0242 | 1.02× |
| snapshot candidate Horner | 0.0209 | 1.18× |
| JS fused batch, prepare included | 0.0084 | 2.93× |
| JS fused batch, cached plan | 0.0049 | 5.06× |
| RiX offload each point | 0.0230 | 1.08× |
| RiX one batch capability | 0.0091 | 2.70× |
| RiX prepare plan + evaluate | 0.0098 | 2.51× |
| RiX cached plan evaluate | 0.0055 | 4.51× |
| RiX operation descriptor | 0.0133 | 1.85× |
| RiX marked Integer-pair Horner | 0.1731 | 0.14× |
| RiX Integer-pair Horner | 0.5579 | 0.04× |

The power-sum/Horner comparison changes the algorithm. Integer-pair Horner is written in RiX and normalizes once at the end; its marked version compiles only that numeric function, while RiX retains point traversal and boundary division. Fused host batches also reduce the boundary count. Cached-plan preparation is excluded only from rows explicitly labeled cached. Snapshots return candidate-class values; other paths return current core/RiX values.
