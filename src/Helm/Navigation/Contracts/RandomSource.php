<?php

declare(strict_types=1);

namespace Helm\Navigation\Contracts;

interface RandomSource
{
    /** Return a roll between 0.0 and 1.0, inclusive. */
    public function next(): float;
}
