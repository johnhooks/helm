<?php

declare(strict_types=1);

namespace Helm\Origin;

/**
 * Deterministic random number generator.
 *
 * Uses a hash-based approach for reproducible sequences.
 * Each instance maintains its own state, independent of other instances.
 * Given the same seed, always produces the same sequence of values.
 */
final class SeededRandom
{
    private string $state;
    private int $counter = 0;

    public function __construct(string $seed)
    {
        $this->state = hash('sha256', $seed);
    }

    /**
     * Get a random integer between min and max (inclusive).
     */
    public function between(int $min, int $max): int
    {
        if ($min > $max) {
            throw new \InvalidArgumentException('Min must be less than or equal to max');
        }

        if ($min === $max) {
            return $min;
        }

        $range = $max - $min;
        $random = $this->nextInt();

        return $min + ($random % ($range + 1));
    }

    /**
     * Roll against a probability (per mille - out of 1000).
     *
     * @param int $probabilityPerMille 500 = 50%, 50 = 5%, etc.
     */
    public function chance(int $probabilityPerMille): bool
    {
        return $this->between(1, 1000) <= $probabilityPerMille;
    }

    /**
     * Pick a random item from an array.
     *
     * @template T
     * @param array<T> $items
     * @return T
     */
    public function pick(array $items): mixed
    {
        if ($items === []) {
            throw new \InvalidArgumentException('Cannot pick from empty array');
        }

        $values = array_values($items);
        $index = $this->between(0, count($values) - 1);

        return $values[$index];
    }

    /**
     * Pick a random item using weighted probabilities.
     *
     * @template T
     * @param array<T, int> $weightedItems Item => weight pairs
     * @return T
     */
    public function pickWeighted(array $weightedItems): mixed
    {
        if ($weightedItems === []) {
            throw new \InvalidArgumentException('Cannot pick from empty array');
        }

        $totalWeight = array_sum($weightedItems);
        $roll = $this->between(1, $totalWeight);

        $cumulative = 0;
        foreach ($weightedItems as $item => $weight) {
            $cumulative += $weight;
            if ($roll <= $cumulative) {
                return $item;
            }
        }

        // Fallback (shouldn't reach here)
        return array_key_first($weightedItems);
    }

    /**
     * Shuffle an array deterministically.
     *
     * @template T
     * @param array<T> $items
     * @return array<T>
     */
    public function shuffle(array $items): array
    {
        $items = array_values($items);
        $count = count($items);

        // Fisher-Yates shuffle
        for ($i = $count - 1; $i > 0; $i--) {
            $j = $this->between(0, $i);
            [$items[$i], $items[$j]] = [$items[$j], $items[$i]];
        }

        return $items;
    }

    /**
     * Get the current state (for debugging/verification).
     */
    public function getState(): string
    {
        return $this->state;
    }

    /**
     * Generate the next random integer (positive, 31-bit).
     */
    private function nextInt(): int
    {
        // Update state using counter to ensure unique values
        $this->counter++;
        $hash = hash('sha256', $this->state . ':' . $this->counter);

        // Update state for next call
        $this->state = $hash;

        // Convert first 8 hex chars to int (gives us 32 bits)
        // Use 0x7FFFFFFF mask to ensure positive value
        return hexdec(substr($hash, 0, 8)) & 0x7FFFFFFF;
    }
}
