# Determinism

How to ensure calculations produce identical results across different servers.

## Why This Matters

**Current model:** Origin computes everything. Ships are clients.

**Future federation:** Origins may verify each other's discoveries and transfers. When that happens:

```
Origin Alpha generates HIP_8102 system
Origin Beta wants to verify (before accepting transfers)
Origin Beta re-generates HIP_8102

Both MUST produce identical output.
Identical output = identical hash.
Identical hash = verified.

One bit different = verification fails.
```

We maintain deterministic computation now so future federation is possible. Even in single-Origin mode, determinism ensures:
- Reproducible bug reports
- Predictable game behavior
- Foundation for cross-Origin verification later

## The Enemy: Floating Point

### IEEE 754 Is Not Your Friend

```php
// This looks safe
$result = 0.1 + 0.2;

// But actually
var_dump($result == 0.3);  // false
var_dump($result);         // 0.30000000000000004
```

Floating point numbers are approximations. Different CPUs can approximate differently.

### Architecture Differences

```
Intel x86:
- 80-bit extended precision internally
- Rounds to 64-bit for storage
- Intermediate results can vary

AMD:
- Similar but not identical
- Different microcode = different rounding

ARM:
- Different FPU implementation
- May use different rounding modes
- NEON vs VFP differences
```

### PHP Floating Point Gotchas

```php
// Comparison fails
$a = 0.7 + 0.1;
$b = 0.8;
var_dump($a == $b);  // false (sometimes)

// String conversion varies
$x = 1/3;
echo $x;  // "0.33333333333333" - but how many 3s?

// JSON encoding
json_encode(0.1 + 0.2);  // "0.30000000000000004" or "0.3"?

// Different on different PHP versions/configs
ini_get('precision');       // affects display
ini_get('serialize_precision');  // affects json_encode
```

### Never Use Floats for Verified Calculations

```php
// WRONG - will fail verification
$yield = $baseYield * 1.25;
$hash = hash('sha256', json_encode($yield));

// Float representation may differ across systems
// Hash will not match
```

## The Solution: Integer Math

### Everything Is Integers

```php
// Instead of 1.25, use 125 and divide by 100 later
$MULTIPLIER_SCALE = 100;

$baseYield = 100;
$bonusMultiplier = 125;  // represents 1.25

$yield = intdiv($baseYield * $bonusMultiplier, $MULTIPLIER_SCALE);
// 100 * 125 / 100 = 125

// Display to user
$displayYield = $yield;  // 125 units
```

### Fixed-Point Arithmetic

Use integers with an implied decimal point:

```php
class FixedPoint
{
    // Scale factor: 1000 = 3 decimal places
    private const SCALE = 1000;

    private int $value;

    public function __construct(int $scaledValue)
    {
        $this->value = $scaledValue;
    }

    public static function fromFloat(float $f): self
    {
        // Only use this for initial constants, not calculations
        return new self((int) round($f * self::SCALE));
    }

    public static function fromInt(int $i): self
    {
        return new self($i * self::SCALE);
    }

    public function add(FixedPoint $other): FixedPoint
    {
        return new self($this->value + $other->value);
    }

    public function subtract(FixedPoint $other): FixedPoint
    {
        return new self($this->value - $other->value);
    }

    public function multiply(FixedPoint $other): FixedPoint
    {
        // Multiply then scale back down
        return new self(intdiv($this->value * $other->value, self::SCALE));
    }

    public function divide(FixedPoint $other): FixedPoint
    {
        // Scale up before divide to maintain precision
        return new self(intdiv($this->value * self::SCALE, $other->value));
    }

    public function toInt(): int
    {
        return intdiv($this->value, self::SCALE);
    }

    public function raw(): int
    {
        return $this->value;
    }
}
```

### Usage Example

```php
// Mining yield calculation

// Constants defined as scaled integers
const YIELD_SCALE = 1000;
const BASE_YIELD_PER_HOUR = 10_000;  // 10.000 units
const ARTIFACT_BONUS = 1_250;        // 1.250 multiplier (25% bonus)
const LOCATION_RICHNESS = 800;       // 0.800 multiplier (poor location)

function calculateYield(int $durationSeconds): int
{
    $hours = intdiv($durationSeconds, 3600);

    // Base yield (scaled)
    $baseYield = $hours * BASE_YIELD_PER_HOUR;

    // Apply artifact bonus
    $withArtifact = intdiv($baseYield * ARTIFACT_BONUS, YIELD_SCALE);

    // Apply location modifier
    $withLocation = intdiv($withArtifact * LOCATION_RICHNESS, YIELD_SCALE);

    // Final yield (descale to actual units)
    return intdiv($withLocation, YIELD_SCALE);
}

// 6 hours mining
$yield = calculateYield(21600);
// = intdiv(intdiv(intdiv(6 * 10000 * 1250, 1000) * 800, 1000), 1000)
// = intdiv(intdiv(75000 * 800, 1000), 1000)
// = intdiv(60000, 1000)
// = 60 units

// This will be identical on every system
```

## Integer Division

### PHP's intdiv()

```php
// WRONG - float division
$result = 10 / 3;  // 3.3333...

// WRONG - cast truncates toward zero
$result = (int)(10 / 3);  // 3, but -10/3 = -3 (not -4)

// RIGHT - intdiv always truncates toward zero consistently
$result = intdiv(10, 3);   // 3
$result = intdiv(-10, 3);  // -3
$result = intdiv(10, -3);  // -3
$result = intdiv(-10, -3); // 3
```

### Rounding Rules

Pick ONE rounding strategy and use it everywhere:

```php
class IntMath
{
    /**
     * Divide with floor (round toward negative infinity)
     * 10/3 = 3, -10/3 = -4
     */
    public static function divFloor(int $a, int $b): int
    {
        $result = intdiv($a, $b);
        $remainder = $a % $b;

        // Adjust if signs differ and there's a remainder
        if ($remainder !== 0 && ($a < 0) !== ($b < 0)) {
            $result--;
        }

        return $result;
    }

    /**
     * Divide with ceiling (round toward positive infinity)
     * 10/3 = 4, -10/3 = -3
     */
    public static function divCeil(int $a, int $b): int
    {
        $result = intdiv($a, $b);
        $remainder = $a % $b;

        // Adjust if same signs and there's a remainder
        if ($remainder !== 0 && ($a < 0) === ($b < 0)) {
            $result++;
        }

        return $result;
    }

    /**
     * Divide with rounding (round half away from zero)
     * 10/3 = 3, 10/6 = 2 (1.67 rounds to 2)
     */
    public static function divRound(int $a, int $b): int
    {
        // Add half of divisor before dividing
        if (($a < 0) === ($b < 0)) {
            return intdiv($a + intdiv($b, 2), $b);
        } else {
            return intdiv($a - intdiv($b, 2), $b);
        }
    }
}
```

### Document the Choice

```php
/**
 * HELM ROUNDING CONVENTION
 *
 * All division uses truncation toward zero (intdiv behavior).
 * This matches most programming languages and is predictable.
 *
 * When calculating yields, bonuses, etc:
 * - Fractional units are lost (truncated)
 * - This slightly favors the system over the player
 * - Consistent across all calculations
 */
```

## Seeded Random Number Generation

### PHP's mt_rand (8.1+)

With PHP 8.1 minimum, we can use the built-in Mersenne Twister. The implementation was fixed in PHP 7.1 and has been stable since.

```php
// Use explicit MT19937 mode for guaranteed consistency
mt_srand(12345, MT_RAND_MT19937);
$value = mt_rand(0, 100);  // Deterministic
```

### SeededRandom Wrapper

```php
class SeededRandom
{
    public function __construct(string $seed)
    {
        // Convert string seed to integer
        $intSeed = $this->seedToInt($seed);
        mt_srand($intSeed, MT_RAND_MT19937);
    }

    private function seedToInt(string $seed): int
    {
        // Use first 8 bytes of SHA-256 as integer
        $hash = hash('sha256', $seed, true);
        $unpacked = unpack('J', substr($hash, 0, 8));
        return $unpacked[1] & 0x7FFFFFFF;  // Keep positive, 31-bit for mt_srand
    }

    /**
     * Random integer in range [min, max] inclusive
     */
    public function between(int $min, int $max): int
    {
        return mt_rand($min, $max);
    }

    /**
     * Random boolean with given probability (0-1000 scale)
     * chance(500) = 50% chance of true
     */
    public function chance(int $probabilityPerMille): bool
    {
        return $this->between(1, 1000) <= $probabilityPerMille;
    }

    /**
     * Pick random element from array
     */
    public function pick(array $items): mixed
    {
        $index = $this->between(0, count($items) - 1);
        return $items[$index];
    }

    /**
     * Shuffle array deterministically
     */
    public function shuffle(array $items): array
    {
        $result = [];
        $remaining = array_values($items);

        while (count($remaining) > 0) {
            $index = $this->between(0, count($remaining) - 1);
            $result[] = $remaining[$index];
            array_splice($remaining, $index, 1);
        }

        return $result;
    }
}
```

**Note:** If a future PHP version breaks mt_rand compatibility, we cry about it and write a migration. The risk is low.

### Seed Derivation

```php
class SeedDeriver
{
    private string $masterSeed;

    public function __construct(string $masterSeed)
    {
        $this->masterSeed = $masterSeed;
    }

    /**
     * Derive seed for a specific location
     */
    public function forLocation(string $systemId, string $bodyId): string
    {
        return hash('sha256', implode(':', [
            $this->masterSeed,
            'location',
            $systemId,
            $bodyId,
        ]));
    }

    /**
     * Derive seed for a work unit
     */
    public function forWorkUnit(string $shipId, string $workType, int $timestamp): string
    {
        return hash('sha256', implode(':', [
            $this->masterSeed,
            'work',
            $shipId,
            $workType,
            (string) $timestamp,
        ]));
    }

    /**
     * Derive seed for artifact generation
     */
    public function forArtifact(string $locationSeed, int $artifactIndex): string
    {
        return hash('sha256', implode(':', [
            $locationSeed,
            'artifact',
            (string) $artifactIndex,
        ]));
    }
}
```

## String Handling

### Encoding

```php
// ALWAYS use UTF-8
mb_internal_encoding('UTF-8');

// When hashing, ensure consistent encoding
function safeHash(array $data): string
{
    // JSON with consistent flags
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    if ($json === false) {
        throw new \RuntimeException('JSON encoding failed');
    }

    return hash('sha256', $json);
}
```

### Key Ordering in Arrays

```php
// WRONG - key order might vary
$data = [
    'name' => 'Iron Ore',
    'quantity' => 100,
];
$hash = hash('sha256', json_encode($data));

// If another system builds the array differently:
$data = [
    'quantity' => 100,
    'name' => 'Iron Ore',
];
// JSON is different! Hash won't match.

// RIGHT - sort keys
function canonicalJson(array $data): string
{
    $data = self::sortKeysRecursive($data);
    return json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function sortKeysRecursive(array $data): array
{
    ksort($data);

    foreach ($data as $key => $value) {
        if (is_array($value)) {
            $data[$key] = self::sortKeysRecursive($value);
        }
    }

    return $data;
}
```

### String Comparison

```php
// Use strict comparison
$a === $b  // not $a == $b

// Be explicit about case sensitivity
if (strtolower($a) === strtolower($b)) { }

// Or require exact match
if ($a === $b) { }
```

## Operation Order

### Associativity Matters

```php
// Integer arithmetic is not always associative due to overflow/truncation

// These can give different results:
$result1 = intdiv(intdiv($a * $b, $c), $d);
$result2 = intdiv($a * $b, $c * $d);

// If $c * $d overflows, result2 is wrong
// If $a * $b / $c loses precision, result1 is wrong

// SOLUTION: Document exact order of operations
```

### Specify Evaluation Order

```php
/**
 * Calculate mining yield
 *
 * Formula: (baseYield * duration * artifactBonus * locationRichness) / (SCALE^3)
 *
 * Evaluation order (to prevent overflow):
 * 1. baseYield * duration
 * 2. result / SCALE
 * 3. result * artifactBonus
 * 4. result / SCALE
 * 5. result * locationRichness
 * 6. result / SCALE
 */
function calculateYield(int $baseYield, int $duration, int $artifactBonus, int $locationRichness): int
{
    $result = $baseYield * $duration;
    $result = intdiv($result, SCALE);
    $result = $result * $artifactBonus;
    $result = intdiv($result, SCALE);
    $result = $result * $locationRichness;
    $result = intdiv($result, SCALE);

    return $result;
}
```

### Avoid Overflow

```php
// PHP_INT_MAX on 64-bit: 9,223,372,036,854,775,807

// Check before multiply
function safeMul(int $a, int $b): int
{
    if ($a === 0 || $b === 0) {
        return 0;
    }

    if ($a > intdiv(PHP_INT_MAX, abs($b))) {
        throw new \OverflowException("Integer overflow: $a * $b");
    }

    return $a * $b;
}

// Or use GMP for arbitrary precision
function bigMul(int $a, int $b): string
{
    return gmp_strval(gmp_mul($a, $b));
}
```

## Time Handling

### No System Time in Calculations

```php
// WRONG - time varies between systems
$result = calculateSomething(time());

// RIGHT - time is an input parameter
$result = calculateSomething($workUnit->startedAt);

// Time comes from Origin, is part of work unit, verified by all
```

### Timestamps Are Integers

```php
// Always Unix timestamps (seconds since epoch)
$timestamp = 1706472000;  // Integer, not DateTime object

// No timezone conversions in calculations
// Display formatting happens at UI layer only
```

## Algorithm Versioning

### Version Lock

```php
class SystemGenerator
{
    public const VERSION = 1;

    // Version history:
    // v1: Initial release
    //     - LCG random with seed
    //     - Integer math, SCALE=1000
    //     - Floor rounding

    public function generate(string $seed): array
    {
        // This implementation is FROZEN for v1
        // Any changes require v2
    }
}
```

### Version in Verification

```php
// Work unit includes version
$workUnit = [
    'algorithm_version' => 1,
    'seed' => 'sha256:...',
    'params' => [...],
    'result_hash' => 'sha256:...',
];

// Verifier uses matching version
$generator = $this->getGenerator($workUnit['algorithm_version']);
$result = $generator->generate($workUnit['seed'], $workUnit['params']);
$hash = $this->hashResult($result);

return $hash === $workUnit['result_hash'];
```

### Never Modify Old Versions

```php
// v1 has a bug that gives too much yield?
// DO NOT FIX v1

// Instead:
// 1. Document the bug
// 2. Create v2 with fix
// 3. New work units use v2
// 4. Old work units still verify with v1 (bug included)
```

## Testing Determinism

### Cross-Platform Tests

```php
class DeterminismTest extends TestCase
{
    /**
     * Known test vectors - calculated once, verified everywhere
     */
    public function testKnownVectors(): void
    {
        $seed = 'test-seed-12345';
        $rng = new SeededRandom($seed);

        // These values must be identical on all systems
        $this->assertSame(4891726354821946372, $rng->nextInt());
        $this->assertSame(7234519283746519283, $rng->nextInt());
        $this->assertSame(1928374651928374651, $rng->nextInt());
    }

    public function testYieldCalculation(): void
    {
        // Known inputs
        $baseYield = 10_000;
        $duration = 21600;
        $artifactBonus = 1_250;
        $locationRichness = 800;

        // Known output - calculated once, verified everywhere
        $expected = 60;

        $actual = calculateYield($baseYield, $duration, $artifactBonus, $locationRichness);

        $this->assertSame($expected, $actual);
    }

    public function testGenerationHash(): void
    {
        $seed = 'HIP_8102:origin-alpha:1';
        $generator = new SystemGenerator();

        $result = $generator->generate($seed);
        $hash = hashResult($result);

        // This hash must be identical on all systems
        $this->assertSame(
            'sha256:a1b2c3d4e5f6g7h8i9j0...',
            $hash
        );
    }
}
```

### CI Testing Matrix

```yaml
# .github/workflows/determinism.yml
name: Determinism Tests

on: [push, pull_request]

jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest]
        php: ['8.1', '8.2', '8.3']
        include:
          - os: ubuntu-latest
            arch: amd64
          - os: macos-latest
            arch: arm64

    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: ${{ matrix.php }}

      - name: Run determinism tests
        run: vendor/bin/phpunit --filter Determinism
```

### Verification Test Harness

```php
class VerificationHarness
{
    /**
     * Generate test cases and their expected results
     */
    public function generateTestVectors(): array
    {
        return [
            [
                'name' => 'basic_mining',
                'input' => [
                    'seed' => 'test-mining-001',
                    'duration' => 3600,
                    'resource' => 'iron_ore',
                ],
                'expected_hash' => 'sha256:...',
            ],
            [
                'name' => 'system_generation',
                'input' => [
                    'seed' => 'HIP_8102:test-origin',
                    'version' => 1,
                ],
                'expected_hash' => 'sha256:...',
            ],
            // ... more test cases
        ];
    }

    /**
     * Verify this system matches expected results
     */
    public function verify(): array
    {
        $results = [];

        foreach ($this->generateTestVectors() as $test) {
            $actualHash = $this->runTest($test['input']);
            $results[$test['name']] = [
                'passed' => $actualHash === $test['expected_hash'],
                'expected' => $test['expected_hash'],
                'actual' => $actualHash,
            ];
        }

        return $results;
    }
}
```

## Checklist

Before any calculation can be verified:

```
□ No floating point math
□ All division uses intdiv()
□ Rounding rules documented and consistent
□ Seeded RNG (mt_rand with MT_RAND_MT19937)
□ Seeds derived deterministically
□ JSON keys sorted before hashing
□ UTF-8 encoding explicit
□ Operation order specified
□ No overflow possible (or checked)
□ No system time in calculations
□ Algorithm version tracked
□ Test vectors documented
□ Cross-platform CI tests pass
```

## Summary

Determinism in Helm requires:

1. **Integer math only** - No floats, use fixed-point
2. **Explicit rounding** - intdiv() with documented behavior
3. **Seeded RNG** - mt_rand with MT_RAND_MT19937 mode (stable since PHP 7.1)
4. **Canonical serialization** - Sorted keys, UTF-8, consistent JSON
5. **Specified order** - Document exact evaluation sequence
6. **Version locking** - Never change old algorithm versions
7. **Cross-platform testing** - Verify on multiple OS/PHP versions

The goal: any server running the same code with the same inputs produces the same output, bit-for-bit, every time.

**Current use:** Origin computes everything deterministically for consistency.

**Future use:** Enables cross-Origin verification when federation is implemented.
