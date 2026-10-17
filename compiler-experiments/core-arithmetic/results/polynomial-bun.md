# Combined polynomial operations — bun

7 measured rounds, 2 warmups. Each row is ms per complete point batch.

## integer-degree32

Degree 32, 32 points.

| Path | Median ms | Speedup vs JS core Horner |
|---|---:|---:|
| JS power sum, core methods | 0.2764 | 0.14× |
| RiX power sum | 31.6343 | 0.00× |
| JS Horner, core methods | 0.0388 | 1.00× |
| RiX Horner | 3.0030 | 0.01× |
| JS Horner, public fast paths | 0.0725 | 0.54× |
| RiX Horner, public fast paths | 2.8029 | 0.01× |
| JS fused batch, prepare included | 0.0376 | 1.03× |
| JS fused batch, cached plan | 0.0303 | 1.28× |
| RiX offload each point | 0.2177 | 0.18× |
| RiX one batch capability | 0.0388 | 1.00× |
| RiX prepare plan + evaluate | 0.0389 | 1.00× |
| RiX cached plan evaluate | 0.0323 | 1.20× |
| RiX operation descriptor | 0.0439 | 0.88× |
| RiX marked BigInt Horner | 0.0994 | 0.39× |

## rational-degree16

Degree 16, 16 points.

| Path | Median ms | Speedup vs JS core Horner |
|---|---:|---:|
| JS power sum, core methods | 15.9885 | 0.20× |
| RiX power sum | 34.4018 | 0.10× |
| JS Horner, core methods | 3.2773 | 1.00× |
| RiX Horner | 6.0439 | 0.54× |
| JS Horner, public fast paths | 3.5498 | 0.92× |
| RiX Horner, public fast paths | 6.1255 | 0.54× |
| snapshot control Horner | 3.2741 | 1.00× |
| snapshot candidate Horner | 0.2076 | 15.79× |
| JS fused batch, prepare included | 0.2325 | 14.09× |
| JS fused batch, cached plan | 0.2269 | 14.45× |
| RiX offload each point | 0.2911 | 11.26× |
| RiX one batch capability | 0.2368 | 13.84× |
| RiX prepare plan + evaluate | 0.2364 | 13.86× |
| RiX cached plan evaluate | 0.2331 | 14.06× |
| RiX operation descriptor | 0.2503 | 13.09× |
| RiX marked Integer-pair Horner | 0.8080 | 4.06× |
| RiX Integer-pair Horner | 1.3595 | 2.41× |

## rational-coefficients-degree16

Degree 16, 16 points.

| Path | Median ms | Speedup vs JS core Horner |
|---|---:|---:|
| JS power sum, core methods | 16.3000 | 0.21× |
| RiX power sum | 35.2698 | 0.10× |
| JS Horner, core methods | 3.4260 | 1.00× |
| RiX Horner | 6.2317 | 0.55× |
| JS Horner, public fast paths | 3.7051 | 0.92× |
| RiX Horner, public fast paths | 6.5337 | 0.52× |
| snapshot control Horner | 3.3922 | 1.01× |
| snapshot candidate Horner | 0.2623 | 13.06× |
| JS fused batch, prepare included | 0.2445 | 14.01× |
| JS fused batch, cached plan | 0.2340 | 14.64× |
| RiX offload each point | 0.3117 | 10.99× |
| RiX one batch capability | 0.2461 | 13.92× |
| RiX prepare plan + evaluate | 0.2467 | 13.89× |
| RiX cached plan evaluate | 0.2383 | 14.38× |
| RiX operation descriptor | 0.2585 | 13.25× |

## zero-polynomial-degree128

Degree 128, 4 points.

| Path | Median ms | Speedup vs JS core Horner |
|---|---:|---:|
| JS Horner, core methods | 0.0394 | 1.00× |
| RiX Horner | 1.5090 | 0.03× |
| JS Horner, public fast paths | 0.0816 | 0.48× |
| RiX Horner, public fast paths | 1.4311 | 0.03× |
| snapshot control Horner | 0.0354 | 1.11× |
| snapshot candidate Horner | 0.0455 | 0.87× |
| JS fused batch, prepare included | 0.0949 | 0.42× |
| JS fused batch, cached plan | 0.0739 | 0.53× |
| RiX offload each point | 0.1508 | 0.26× |
| RiX one batch capability | 0.0966 | 0.41× |
| RiX prepare plan + evaluate | 0.0971 | 0.41× |
| RiX cached plan evaluate | 0.0757 | 0.52× |
| RiX operation descriptor | 0.1072 | 0.37× |
| RiX marked Integer-pair Horner | 0.2562 | 0.15× |
| RiX Integer-pair Horner | 1.9607 | 0.02× |
| JS cached plan, prune leading zeros | 0.0002 | 222.31× |

## cancellation-degree32

Degree 32, 4 points.

| Path | Median ms | Speedup vs JS core Horner |
|---|---:|---:|
| JS power sum, core methods | 0.1183 | 0.17× |
| RiX power sum | 3.9657 | 0.01× |
| JS Horner, core methods | 0.0204 | 1.00× |
| RiX Horner | 0.3900 | 0.05× |
| JS Horner, public fast paths | 0.0326 | 0.63× |
| RiX Horner, public fast paths | 0.3787 | 0.05× |
| snapshot control Horner | 0.0193 | 1.06× |
| snapshot candidate Horner | 0.0181 | 1.13× |
| JS fused batch, prepare included | 0.0070 | 2.93× |
| JS fused batch, cached plan | 0.0021 | 9.57× |
| RiX offload each point | 0.0241 | 0.85× |
| RiX one batch capability | 0.0073 | 2.79× |
| RiX prepare plan + evaluate | 0.0079 | 2.58× |
| RiX cached plan evaluate | 0.0027 | 7.64× |
| RiX operation descriptor | 0.0104 | 1.96× |
| RiX marked Integer-pair Horner | 0.1390 | 0.15× |
| RiX Integer-pair Horner | 0.4749 | 0.04× |

The power-sum/Horner comparison changes the algorithm. Integer-pair Horner is written in RiX and normalizes once at the end; its marked version compiles only that numeric function, while RiX retains point traversal and boundary division. Fused host batches also reduce the boundary count. Cached-plan preparation is excluded only from rows explicitly labeled cached. Snapshots return candidate-class values; other paths return current core/RiX values.
