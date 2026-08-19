<?php

declare(strict_types=1);

namespace Helm\Simulation;

use Helm\Navigation\Contracts\RandomSource;
use Helm\Origin\SeededRandom;

/** Repeatable rolls with optional scripted outcomes for simulation scenarios. */
final class SimulationRandomSource implements RandomSource
{
    private readonly SeededRandom $random;

    /** @var list<float> */
    private array $rolls = [];

    public function __construct(string $seed = 'simulation')
    {
        $this->random = new SeededRandom($seed);
    }

    /** @param list<float> $rolls */
    public function setRolls(array $rolls): void
    {
        foreach ($rolls as $roll) {
            if (!is_finite($roll) || $roll < 0.0 || $roll > 1.0) {
                throw new \InvalidArgumentException('Simulation rolls must be between 0 and 1');
            }
        }
        $this->rolls = $rolls;
    }

    public function next(): float
    {
        return array_shift($this->rolls) ?? $this->random->between(0, 1000000) / 1000000;
    }
}
