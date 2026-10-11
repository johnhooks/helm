<?php

declare(strict_types=1);

namespace Helm\Experiments\ScanModels;

use Helm\Navigation\Contracts\RandomSource;

/** Experimental single-connection model, never registered with the live game. */
final class Model
{
    public int $cycles = 0;
    public float $work = 0.0;
    public bool $complete = false;
    public float $lastChance = 0.0;

    public function __construct(
        public readonly string $kind,
        public readonly float $expectedCycles,
        private readonly RandomSource $random,
    ) {
    }

    public static function expectedCycles(float $distance, float $difficulty, float $capability): float
    {
        return 12.0 * (1.0 + $distance ** 1.5) * $difficulty / $capability;
    }

    public function tick(): void
    {
        if ($this->complete) {
            return;
        }
        $this->cycles++;
        $this->lastChance = match ($this->kind) {
            'fixed' => min(1.0, 1.0 / $this->expectedCycles),
            // Weibull shape 2: continuous mean matched, discrete mean about half a cycle later.
            'rising' => 1.0 - exp(-((2 * $this->cycles - 1) / ($this->expectedCycles / 0.88622692545) ** 2)),
            'work' => 0.75,
        };
        if ($this->random->next() < $this->lastChance) {
            if ($this->kind === 'work') {
                $this->work++;
                $this->complete = $this->work >= ceil(0.75 * $this->expectedCycles);
            } else {
                $this->complete = true;
            }
        }
    }
}
