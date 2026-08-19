<?php

declare(strict_types=1);

namespace Helm\Navigation;

use Helm\Navigation\Contracts\RandomSource;

final class NativeRandomSource implements RandomSource
{
    public function next(): float
    {
        return mt_rand() / mt_getrandmax();
    }
}
