/**
 * BaseSystem Examples
 *
 * This file demonstrates the usage of the BaseSystem class for working with
 * different number bases in RatMath.
 */

import { BaseSystem } from "../src/base-system.js";

// ============================================================================
// Basic BaseSystem Creation and Usage
// ============================================================================

console.log("=== Basic BaseSystem Usage ===\n");

// Using predefined base systems
const binary = BaseSystem.BINARY;
const octal = BaseSystem.OCTAL;
const decimal = BaseSystem.DECIMAL;
const hex = BaseSystem.HEXADECIMAL;

console.log("Standard base systems:");
console.log(`Binary: ${binary}`);
console.log(`Octal: ${octal}`);
console.log(`Decimal: ${decimal}`);
console.log(`Hexadecimal: ${hex}`);
console.log();

// Creating custom base systems
const base5 = new BaseSystem("01234", "Base 5");
const base12 = new BaseSystem("0-9ab", "Duodecimal");
const base36 = BaseSystem.BASE36;

console.log("Custom base systems:");
console.log(`Base 5: ${base5}`);
console.log(`Base 12: ${base12}`);
console.log(`Base 36: ${base36}`);
console.log();

// ============================================================================
// Number Conversion Examples
// ============================================================================

console.log("=== Number Conversions ===\n");

// Converting the same number across different bases
const number = 42n;
console.log(`Converting decimal ${number} to different bases:`);
console.log(`Binary: ${binary.fromDecimal(number)}`);
console.log(`Octal: ${octal.fromDecimal(number)}`);
console.log(`Hexadecimal: ${hex.fromDecimal(number)}`);
console.log(`Base 5: ${base5.fromDecimal(number)}`);
console.log(`Base 12: ${base12.fromDecimal(number)}`);
console.log();

// Converting from different bases back to decimal
console.log("Converting from different bases back to decimal:");
console.log(`101010[2] = ${binary.toDecimal("101010")}`);
console.log(`52[8] = ${octal.toDecimal("52")}`);
console.log(`2a[16] = ${hex.toDecimal("2a")}`);
console.log(`132[5] = ${base5.toDecimal("132")}`);
console.log(`36[12] = ${base12.toDecimal("36")}`);
console.log();

// ============================================================================
// Base Conversion Chain
// ============================================================================

console.log("=== Base Conversion Chain ===\n");

// Convert a hexadecimal number through various bases
const hexInput = "ff";
console.log(`Starting with hexadecimal: ${hexInput}`);

const decimalValue = hex.toDecimal(hexInput);
console.log(`Decimal equivalent: ${decimalValue}`);

console.log("Converting to other bases:");
console.log(`Binary: ${binary.fromDecimal(decimalValue)}`);
console.log(`Octal: ${octal.fromDecimal(decimalValue)}`);
console.log(`Base 5: ${base5.fromDecimal(decimalValue)}`);
console.log(`Base 36: ${base36.fromDecimal(decimalValue)}`);
console.log();

// ============================================================================
// Working with Large Numbers
// ============================================================================

console.log("=== Large Number Examples ===\n");

// Factorial example - convert 10! to different bases
const factorial10 = 3628800n;
console.log(`10! = ${factorial10} in decimal`);
console.log(`Binary: ${binary.fromDecimal(factorial10)}`);
console.log(`Hexadecimal: ${hex.fromDecimal(factorial10)}`);
console.log(`Base 36: ${base36.fromDecimal(factorial10)}`);
console.log();

// Powers of 2
const power2_20 = 2n ** 20n; // 2^20 = 1048576
console.log(`2^20 = ${power2_20}`);
console.log(`Binary: ${binary.fromDecimal(power2_20)}`);
console.log(`Hexadecimal: ${hex.fromDecimal(power2_20)}`);
console.log();

// ============================================================================
// Custom Base Systems
// ============================================================================

console.log("=== Custom Base Systems ===\n");

// Create a base system using only vowels
try {
  const vowelBase = new BaseSystem("aeiou", "Vowel Base");
  console.log(`Vowel base system: ${vowelBase}`);

  const testNumber = 42n;
  const vowelRepresentation = vowelBase.fromDecimal(testNumber);
  console.log(`${testNumber} in vowel base: ${vowelRepresentation}`);
  console.log(`Back to decimal: ${vowelBase.toDecimal(vowelRepresentation)}`);
  console.log();
} catch (error) {
  console.log(`Error creating vowel base: ${error.message}`);
}

// Create a base system with mixed ranges
const mixedBase = new BaseSystem("0-4A-F", "Mixed Base 10");
console.log(`Mixed base system: ${mixedBase}`);
console.log(`Characters: ${mixedBase.characters.join(", ")}`);

const testValue = 123n;
const mixedRepresentation = mixedBase.fromDecimal(testValue);
console.log(`${testValue} in mixed base: ${mixedRepresentation}`);
console.log();

// ============================================================================
// Validation Examples
// ============================================================================

console.log("=== Validation Examples ===\n");

// Test string validation
const testStrings = ["123", "ABC", "xyz", "101", "GHI"];

console.log("Testing string validation in hexadecimal:");
testStrings.forEach((str) => {
  const isValid = hex.isValidString(str);
  console.log(`"${str}": ${isValid ? "valid" : "invalid"}`);
});
console.log();

// Show base system properties
console.log("Hexadecimal base system properties:");
console.log(`Base: ${hex.base}`);
console.log(`Min digit: ${hex.getMinDigit()}`);
console.log(`Max digit: ${hex.getMaxDigit()}`);
console.log(`Character count: ${hex.characters.length}`);
console.log();

// ============================================================================
// Error Handling Examples
// ============================================================================

console.log("=== Error Handling Examples ===\n");

// Attempt to create base system with parser conflicts
console.log("Attempting to create base systems with reserved characters:");

const conflictingSequences = ["0-9+", "a-z*", "0123()"];

conflictingSequences.forEach((sequence) => {
  try {
    new BaseSystem(sequence);
    console.log(`"${sequence}": Success`);
  } catch (error) {
    console.log(`"${sequence}": ${error.message}`);
  }
});
console.log();

// Invalid character in conversion
console.log("Testing invalid characters in conversion:");
try {
  binary.toDecimal("1012"); // '2' is invalid in binary
} catch (error) {
  console.log(`Binary conversion error: ${error.message}`);
}

try {
  octal.toDecimal("789"); // '8' and '9' are invalid in octal
} catch (error) {
  console.log(`Octal conversion error: ${error.message}`);
}
console.log();

// ============================================================================
// Comparison and Utility Examples
// ============================================================================

console.log("=== Comparison and Utilities ===\n");

// Create equivalent base systems
const decimal1 = new BaseSystem("0-9");
const decimal2 = BaseSystem.DECIMAL;

console.log(`Are the decimal systems equal? ${decimal1.equals(decimal2)}`);

// Using fromBase factory method
const base16_factory = BaseSystem.fromBase(16);
const base16_preset = BaseSystem.HEXADECIMAL;

console.log(
  `Factory vs preset base 16: ${base16_factory.equals(base16_preset)}`,
);
console.log();

// Test edge cases
console.log("Edge case examples:");

// Minimum base (base 2)
const minBase = new BaseSystem("01");
console.log(`Minimum base: ${minBase}`);

// Convert zero
console.log(`Zero in binary: ${binary.fromDecimal(0n)}`);
console.log(`Zero in hex: ${hex.fromDecimal(0n)}`);

// Negative numbers
console.log(`-42 in binary: ${binary.fromDecimal(-42n)}`);
console.log(`-255 in hex: ${hex.fromDecimal(-255n)}`);
console.log();

// ============================================================================
// Extended Base Systems and Validation
// ============================================================================

console.log("=== Extended Base Systems and Validation ===\n");

// Extended base presets
console.log("Extended base systems:");
console.log(`Base 60: ${BaseSystem.BASE60}`);
console.log(`Roman Numerals: ${BaseSystem.ROMAN}`);
console.log();

// Test Base 60 (sexagesimal)
const base60 = BaseSystem.BASE60;
const testNumber60 = 3600n; // 1 hour in seconds
console.log(`Converting ${testNumber60} (seconds in an hour) to base 60:`);
console.log(`Base 60: ${base60.fromDecimal(testNumber60)}`);
console.log(
  `Back to decimal: ${base60.toDecimal(base60.fromDecimal(testNumber60))}`,
);
console.log();

// Roman numeral examples
console.log("Roman numeral system:");
const roman = BaseSystem.ROMAN;
console.log(`Roman characters: ${roman.characters.join(", ")}`);

// Test small Roman numbers
const romanTests = [1n, 5n, 10n, 50n, 100n, 500n, 1000n];
console.log("Converting numbers to Roman base representation:");
romanTests.forEach((num) => {
  const romanStr = roman.fromDecimal(num);
  console.log(`${num} → ${romanStr}`);
});
console.log();

// Custom pattern examples
console.log("Creating base systems with patterns:");

try {
  const digitsOnly = BaseSystem.createPattern("digits-only", 8);
  console.log(`Digits-only base 8: ${digitsOnly}`);

  const lettersOnly = BaseSystem.createPattern("letters-only", 16);
  console.log(`Letters-only base 16: ${lettersOnly}`);

  const uppercaseOnly = BaseSystem.createPattern("uppercase-only", 10);
  console.log(`Uppercase-only base 10: ${uppercaseOnly}`);
} catch (error) {
  console.log(`Pattern creation error: ${error.message}`);
}
console.log();

// Case sensitivity examples
console.log("Case sensitivity handling:");
const mixedCase = new BaseSystem("aAbBcC", "Mixed Case Base");
console.log(`Original mixed case: ${mixedCase}`);

const caseInsensitive = mixedCase.withCaseSensitivity(false);
console.log(`Case insensitive version: ${caseInsensitive}`);
console.log();

// Validation examples
console.log("Base system validation:");

// Test character ordering validation
try {
  const unorderedBase = new BaseSystem("0359a", "Unordered Base");
  console.log(`Unordered base created: ${unorderedBase}`);
} catch (error) {
  console.log(`Validation error: ${error.message}`);
}

// Test base vs character length validation
try {
  const invalidBase = new BaseSystem("01", "Test Base");
  // This should work fine
  console.log(`Valid base 2: ${invalidBase}`);
} catch (error) {
  console.log(`Validation error: ${error.message}`);
}
console.log();

// ============================================================================
// Practical Applications
// ============================================================================

console.log("=== Practical Applications ===\n");

// Color code conversion (RGB to hex)
const red = 255n;
const green = 128n;
const blue = 64n;

console.log("RGB to Hex conversion:");
console.log(`RGB(${red}, ${green}, ${blue})`);
console.log(`Red: ${hex.fromDecimal(red).padStart(2, "0")}`);
console.log(`Green: ${hex.fromDecimal(green).padStart(2, "0")}`);
console.log(`Blue: ${hex.fromDecimal(blue).padStart(2, "0")}`);

const hexColor =
  hex.fromDecimal(red).padStart(2, "0") +
  hex.fromDecimal(green).padStart(2, "0") +
  hex.fromDecimal(blue).padStart(2, "0");
console.log(`Hex color: #${hexColor}`);
console.log();

// File size representation
const fileSize = 1073741824n; // 1 GB in bytes
console.log(`File size: ${fileSize} bytes`);
console.log(`Binary: ${binary.fromDecimal(fileSize)}`);
console.log(`Hexadecimal: ${hex.fromDecimal(fileSize)}`);

// Show that it's exactly 2^30
const power30 = binary.fromDecimal(fileSize);
console.log(`Binary representation shows it's 2^30: ${power30}`);
console.log();

// ============================================================================
// Parser Integration Examples - Base Notation Syntax
// ============================================================================

console.log("=== Parser Integration - Base Notation Syntax ===\n");

// Import the Parser class to demonstrate base notation parsing
import { Parser } from "../src/parser.js";

// Basic base notation examples
console.log("Basic base notation parsing:");
console.log(`101[2] = ${Parser.parse("101[2]")}`); // Binary 101 = 5
console.log(`777[8] = ${Parser.parse("777[8]")}`); // Octal 777 = 511
console.log(`FF[16] = ${Parser.parse("FF[16]")}`); // Hex FF = 255
console.log(`132[5] = ${Parser.parse("132[5]")}`); // Base 5: 132 = 42
console.log(`36[12] = ${Parser.parse("36[12]")}`); // Base 12: 36 = 42
console.log();

// Negative numbers
console.log("Negative numbers in different bases:");
console.log(`-101[2] = ${Parser.parse("-101[2]")}`); // -5
console.log(`-FF[16] = ${Parser.parse("-FF[16]")}`); // -255
console.log(`-123[8] = ${Parser.parse("-123[8]")}`); // -83
console.log();

// Decimal notation in different bases
console.log("Decimal notation in different bases:");
console.log(`10.1[2] = ${Parser.parse("10.1[2]")}`); // Binary 10.1 = 2.5
console.log(`A.8[16] = ${Parser.parse("A.8[16]")}`); // Hex A.8 = 10.5
console.log(`7.4[8] = ${Parser.parse("7.4[8]")}`); // Octal 7.4 = 7.5
console.log(`1.11[2] = ${Parser.parse("1.11[2]")}`); // Binary 1.11 = 1.75
console.log();

// Fraction notation in different bases
console.log("Fraction notation in different bases:");
console.log(`1/10[2] = ${Parser.parse("1/10[2]")}`); // 1/2 in binary = 0.5
console.log(`F/10[16] = ${Parser.parse("F/10[16]")}`); // 15/16 in hex
console.log(`11/100[2] = ${Parser.parse("11/100[2]")}`); // 3/4 in binary
console.log(`A/C[16] = ${Parser.parse("A/C[16]")}`); // 10/12 = 5/6 in hex
console.log();

// Mixed number notation in different bases
console.log("Mixed number notation in different bases:");
console.log(`1..1/10[2] = ${Parser.parse("1..1/10[2]")}`); // 1 and 1/2 in binary = 1.5
console.log(`A..8/10[16] = ${Parser.parse("A..8/10[16]")}`); // 10 and 8/16 in hex = 10.5
console.log(`10..11/100[2] = ${Parser.parse("10..11/100[2]")}`); // 2 and 3/4 in binary = 2.75
console.log();

// Interval notation in different bases
console.log("Interval notation in different bases:");
console.log(`101:111[2] = ${Parser.parse("101:111[2]")}`); // Binary interval 5:7
console.log(`A:F[16] = ${Parser.parse("A:F[16]")}`); // Hex interval 10:15
console.log(`10:17[8] = ${Parser.parse("10:17[8]")}`); // Octal interval 8:15
console.log(`A.8:F.F[16] = ${Parser.parse("A.8:F.F[16]")}`); // Hex decimal interval
console.log();

// Arithmetic expressions with base notation
console.log("Arithmetic expressions with base notation:");
console.log(`101[2] + 11[2] = ${Parser.parse("101[2] + 11[2]")}`); // 5 + 3 = 8
console.log(`FF[16] - A[16] = ${Parser.parse("FF[16] - A[16]")}`); // 255 - 10 = 245
console.log(`777[8] * 2 = ${Parser.parse("777[8] * 2")}`); // 511 * 2 = 1022
console.log(`100[2] / 10[2] = ${Parser.parse("100[2] / 10[2]")}`); // 4 / 2 = 2
console.log();

// Mixed bases in expressions
console.log("Mixed bases in expressions:");
console.log(`FF[16] + 101[2] = ${Parser.parse("FF[16] + 101[2]")}`); // 255 + 5 = 260
console.log(`777[8] - 11111111[2] = ${Parser.parse("777[8] - 11111111[2]")}`); // 511 - 255 = 256
console.log(`A[16] * 101[2] = ${Parser.parse("A[16] * 101[2]")}`); // 10 * 5 = 50
console.log();

// Complex expressions with parentheses
console.log("Complex expressions with base notation:");
console.log(
  `(101[2] + 11[2]) * 10[2] = ${Parser.parse("(101[2] + 11[2]) * 10[2]")}`,
); // (5+3)*2 = 16
console.log(`FF[16] / (A[16] + 1) = ${Parser.parse("FF[16] / (A[16] + 1)")}`); // 255/(10+1) = 255/11
console.log(`(A.8[16] - 5.0) * 2 = ${Parser.parse("(A.8[16] - 5.0) * 2")}`); // (10.5-5)*2 = 11
console.log();

// Demonstrating exact arithmetic preservation
console.log("Exact arithmetic preservation:");
const binaryFraction = Parser.parse("1/11[2]"); // 1/3 in binary
console.log(`1/11[2] (exact) = ${binaryFraction}`); // Shows exact fraction 1/3
console.log(`Decimal approximation ≈ ${binaryFraction.toDecimal(10)}`); // Shows decimal approximation
console.log();

const hexMixedNumber = Parser.parse("F..F/10[16]"); // 15 and 15/16
console.log(`F..F/10[16] (exact) = ${hexMixedNumber}`); // Shows exact mixed number
console.log(`Decimal value = ${hexMixedNumber.toDecimal(4)}`); // Shows decimal value
console.log();

// Error handling examples
console.log("Error handling examples:");
const errorCases = [
  { expr: "123[2]", desc: "Invalid digit '2' or '3' in binary" },
  { expr: "XYZ[16]", desc: "Invalid characters in hexadecimal" },
  { expr: "101[100]", desc: "Base too large" },
  { expr: "101[1]", desc: "Base too small" },
  { expr: "1/0[2]", desc: "Division by zero" },
];

errorCases.forEach(({ expr, desc }) => {
  try {
    const result = Parser.parse(expr);
    console.log(`${expr}: ${result} (unexpected success)`);
  } catch (error) {
    console.log(`${expr}: Error - ${desc}`);
  }
});
console.log();

// Practical applications
console.log("Practical applications:");

// Binary arithmetic for computer science
console.log("Binary arithmetic (useful for computer science):");
console.log(
  `11111111[2] = ${Parser.parse("11111111[2]")} (max value for 8-bit unsigned)`,
);
console.log(
  `10000000[2] = ${Parser.parse("10000000[2]")} (2^7, MSB for 8-bit signed)`,
);
console.log(
  `11111111[2] + 1 = ${Parser.parse("11111111[2] + 1")} (overflow demo)`,
);
console.log();

// Hexadecimal for memory addresses and colors
console.log("Hexadecimal applications:");
console.log(
  `DEADBEEF[16] = ${Parser.parse("DEADBEEF[16]")} (common test hex value)`,
);
console.log(`FF0000[16] = ${Parser.parse("FF0000[16]")} (red color value)`);
console.log(`00FF00[16] = ${Parser.parse("00FF00[16]")} (green color value)`);
console.log(`0000FF[16] = ${Parser.parse("0000FF[16]")} (blue color value)`);
console.log();

// Base conversion chains using parser
console.log("Base conversion using parser expressions:");
const originalHex = "1F4[16]"; // 500 in hex
console.log(`Original: ${originalHex} = ${Parser.parse(originalHex)}`);

// We can show what this would be in other bases by using BaseSystem directly
const value = Parser.parse(originalHex);
const binarySystem = BaseSystem.BINARY;
const octalSystem = BaseSystem.OCTAL;

console.log(
  `Same value in binary: ${binarySystem.fromDecimal(BigInt(value.toString()))}`,
);
console.log(
  `Same value in octal: ${octalSystem.fromDecimal(BigInt(value.toString()))}`,
);
console.log(`Verification: 111110100[2] = ${Parser.parse("111110100[2]")}`);
console.log(`Verification: 764[8] = ${Parser.parse("764[8]")}`);
console.log();

console.log("=== End of BaseSystem Examples ===");
