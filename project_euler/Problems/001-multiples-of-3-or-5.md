# Problem 1: Multiples of 3 or 5

## The problem

The natural numbers below 10 that are multiples of 3 or 5 are 3, 5, 6 and 9,
and they add up to 23. Find the sum of all the multiples of 3 or 5 below 1000.

Source: [Project Euler problem 1](https://projecteuler.net/problem=1).

## Small experiments

Start with the worked example. `.IRANGE(a, b)` builds the integers from `a`
to `b` inclusive, so "below 10" is `.IRANGE(1, 9)`. The filter pipe `|>?`
keeps the values for which a predicate is true.

```rix edu
IsTarget(n) -> n % 3 == 0 || n % 5 == 0;
small := .IRANGE(1, 9) |>? IsTarget;
```

Those are the four numbers from the statement. A reduce pipe `|>:` folds them
with addition; `@+` is the addition operator as a function, and `[2]` caps it
to two arguments so the pipe's extra position argument is ignored.

```rix edu
small |>: @+[2] ##@ == 23;
```

The `##@ == 23` comment is a checked assertion: the notebook reports an error
if the value on its line is not 23.

## A first general solution

Wrapping the experiment in a function of the limit gives a direct solution.
The explicit starting value `0` (the `|:> 0 >:` form) keeps it correct even
when nothing passes the filter.

```rix edu
BruteSum(limit) -> .IRANGE(1, limit - 1) |>? IsTarget |:> 0 >: @+[2];
BruteSum(10) ##@ == 23;
BruteSum(1000);
```

## A closed form

Filtering visits every number. We can do better. The multiples of $k$ below
the limit are $k, 2k, \dots, mk$ with $m = \lfloor (\text{limit}-1)/k \rfloor$,
so their sum is

$$k\,(1 + 2 + \dots + m) = k\,\frac{m(m+1)}{2}.$$

`//` is floor division, so $m$ is one expression.

```rix edu
SumOfMultiples(k, limit) -> {; m := (limit - 1) // k; k * m * (m + 1) / 2 };
SumOfMultiples(3, 10) ##@ == 18;
SumOfMultiples(5, 10) ##@ == 5;
```

Adding those gives 23, but only because 15 is not below 10. In general a
multiple of 15 is counted in both sums, so it must be subtracted once
(inclusion and exclusion).

```rix edu
ClosedSum(limit) -> SumOfMultiples(3, limit) + SumOfMultiples(5, limit) - SumOfMultiples(15, limit);
[10, 16, 100, 1000, 2500] |>> (limit) -> {: limit, BruteSum(limit), ClosedSum(limit) };
```

The two methods agree on every limit tried, including 16 where the overlap
at 15 first matters. To check that mechanically, filter for the limits where
they differ and assert that none are left.

```rix edu
disagreements := [10, 16, 100, 1000, 2500] |>? (limit) -> BruteSum(limit) != ClosedSum(limit);
disagreements.Len() ##@ == 0;
```

Because RiX integers are exact and unbounded, the closed form answers the
same question for limits no loop could reach.

```rix edu
ClosedSum(10^30);
```

## Answer

```rix edu
answer := ClosedSum(1000);
answer ##@ == 233168;
```

The sum of all multiples of 3 or 5 below 1000 is **@{answer}**.
