# Problem 5: Smallest multiple

## The problem

2520 is the smallest number that can be divided by each of the numbers from
1 to 10 without any remainder. What is the smallest positive number that is
evenly divisible by all of the numbers from 1 to 20?

Source: [Project Euler problem 5](https://projecteuler.net/problem=5).

## Small experiments

First confirm the claim about 2520: every remainder should be 0.

```rix edu
.IRANGE(1, 10) |>> (k) -> 2520 % k;
```

The obvious candidate, the product $10!$, is divisible by everything but is
far from the smallest. Postfix `!` is factorial.

```rix edu
10!;
10! / 2520;
```

The product overshoots by a factor of 1440 because it counts shared factors
repeatedly: 2 and 4 and 8 each bring their own 2s. What we want is the least
common multiple, and for two numbers

$$\operatorname{lcm}(a, b) = \frac{a\,b}{\gcd(a, b)}.$$

Euclid's algorithm gives the greatest common divisor: replace $(a, b)$ by
$(b, a \bmod b)$ until the second number is 0. The tail call `$(...)` makes
that a loop.

```rix edu
Gcd(a, b) -> b == 0 ?: a ?_ $(b, a % b);
Lcm(a, b) -> a * b / Gcd(a, b);
Gcd(12, 18) ##@ == 6;
Lcm(4, 6) ##@ == 12;
Lcm(8, 9) ##@ == 72;
```

## General solution

The least common multiple of a whole list is a fold: the lcm of the first
two, then of that result with the third, and so on. The reduce pipe passes
the running value and the next element, and `Lcm[2]` discards the pipe's
extra arguments.

```rix edu
SmallestMultiple(n) -> .IRANGE(1, n) |>: Lcm[2];
SmallestMultiple(10) ##@ == 2520;
```

Watching the running value grow shows where the work happens.

```rix edu
.IRANGE(1, 20) |>> (n) -> {: n, SmallestMultiple(n) };
```

The value only changes at 2, 3, 4, 5, 7, 8, 9, 11, 13, 16, 17, 19: exactly
the primes and prime powers. Composite numbers such as 6, 10, 12 or 20 are
already covered by smaller entries.

## The same answer from prime powers

That observation gives a second method. For each prime $p \le n$ the answer
must contain the largest power of $p$ that does not exceed $n$, and nothing
more.

```rix edu
HasDivisorFrom(n, d) -> d * d > n ?: _ ?_ (n % d == 0 ?: 1 ?_ $(n, d + 1));
IsPrime(n) -> n >= 2 && !HasDivisorFrom(n, 2);
TopPower(p, n, power) -> power * p > n ?: power ?_ $(p, n, power * p);
.IRANGE(1, 20) |>? IsPrime;
.IRANGE(1, 20) |>? IsPrime |>> (p) -> TopPower(p, 20, p);
```

The largest powers are 16, 9, 5, 7, 11, 13, 17 and 19. Their product should
match the fold.

```rix edu
ByPrimePowers(n) -> .IRANGE(1, n) |>? IsPrime |>> ((p) -> TopPower(p, n, p)) |:> 1 >: @*[2];
ByPrimePowers(10) ##@ == 2520;
(.IRANGE(1, 60) |>? (n) -> ByPrimePowers(n) != SmallestMultiple(n)).Len() ##@ == 0;
```

Both methods agree for every range from 1 up to 60.

## Answer

```rix edu
answer := SmallestMultiple(20);
answer ##@ == 232792560;
(.IRANGE(1, 20) |>? (k) -> answer % k != 0).Len() ##@ == 0;
20! / answer;
```

The smallest number divisible by everything from 1 to 20 is **@{answer}**,
more than ten billion times smaller than $20!$.
