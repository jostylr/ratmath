# Problem 10: Summation of primes

## The problem

The sum of the primes below 10 is $2 + 3 + 5 + 7 = 17$. Find the sum of all
the primes below two million.

Source: [Project Euler problem 10](https://projecteuler.net/problem=10).

## Small experiments

Testing two million numbers one at a time is wasteful. The sieve of
Eratosthenes turns the problem around: write down all the numbers, then
cross out the multiples of each prime. Whatever survives is prime.

Start with a small table. `.IRANGE` returns a read-only list, so set its
`._mutable` flag before editing entries. Position `k` holds the number `k`,
and crossing out means storing null (`_`). 1 is not prime, so it goes first.

```rix edu
table := .IRANGE(1, 30);
table._mutable = 1;
table[1] = _;
table;
```

Cross out the multiples of 2, starting from $2^2 = 4$.

```rix edu
Cross(flags, p, limit) -> {@::@ m := p * p; m <= limit; flags[m] = _; m += p };
Cross(table, 2, 30);
table;
```

`Cross` changed `table` itself: an array passed to a function is shared, not
copied. The next survivor is 3; start from $3^2 = 9$, because $3 \times 2$
has already gone. Then 5, from 25.

```rix edu
Cross(table, 3, 30);
Cross(table, 5, 30);
table;
table |>? (v) -> v;
```

The next survivor is 7, but $7^2 = 49$ is beyond 30, so nothing more can be
crossed out and the ten survivors are the primes below 30. The filter
`|>? (v) -> v` keeps the non-null entries.

## General solution

`Fresh` builds the table. `Sieve` walks `p` upward while $p^2$ is within the
limit, crossing out from each `p` that is still present, and finally returns
the survivors through the loop's `after` slot.

```rix edu
Fresh(limit) -> {; flags := .IRANGE(1, limit); flags._mutable = 1; flags[1] = _; flags };
Sieve(limit) -> {@::@ flags := Fresh(limit), p := 2; p * p <= limit; flags[p] ?: Cross(flags, p, limit); p += 1; flags |>? (v) -> v };
Sieve(30);
Sieve(30).Join(" ") ##@ == "2 3 5 7 11 13 17 19 23 29";
```

"Below $n$" excludes $n$ itself, so the sum uses a sieve up to $n - 1$.

```rix edu
SumOfPrimesBelow(n) -> Sieve(n - 1) |:> 0 >: @+[2];
SumOfPrimesBelow(10) ##@ == 17;
SumOfPrimesBelow(11) ##@ == 17;
SumOfPrimesBelow(12) ##@ == 28;
```

The boundary behaves correctly: 11 is excluded below 11 and included below
12. Counting primes gives an independent check against well-known values:
25 below 100, 168 below 1000 and 1229 below 10000.

```rix edu
[100, 1000, 10000] |>> (n) -> Sieve(n - 1).Len();
Sieve(999).Len() ##@ == 168;
Sieve(9999).Len() ##@ == 1229;
```

## Answer

The full sieve stores two million entries and performs a few million
crossings, so this cell takes several seconds.

```rix expensive edu
answer := SumOfPrimesBelow(2000000);
answer ##@ == 142913828922;
```

The primes below two million sum to **@{answer}**.
