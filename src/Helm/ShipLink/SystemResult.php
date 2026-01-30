<?php

declare(strict_types=1);

namespace Helm\ShipLink;

/**
 * Base class for system-specific results.
 *
 * Each system can extend this with its own data fields.
 */
class SystemResult
{
    /**
     * @param array<string, mixed> $data
     */
    public function __construct(
        protected array $data = [],
    ) {
    }

    /**
     * Get a data value.
     */
    public function get(string $key, mixed $default = null): mixed
    {
        return $this->data[$key] ?? $default;
    }

    /**
     * Set a data value.
     */
    public function set(string $key, mixed $value): self
    {
        $this->data[$key] = $value;
        return $this;
    }

    /**
     * Convert to array.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return $this->data;
    }

    /**
     * Create from array.
     *
     * @param array<string, mixed> $data
     */
    public static function from(array $data): self
    {
        return new self($data);
    }
}
