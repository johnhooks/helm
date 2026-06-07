<?php

declare(strict_types=1);

namespace Helm\Resources;

/**
 * Base class for client-facing resource representations.
 *
 * Resources define canonical model serialization used by REST responses and
 * broadcast payloads. Transport-specific links and metadata should be added by
 * the transport layer, not by the resource.
 *
 * @template TResource
 */
abstract class Resource
{
    /**
     * @var TResource
     */
    protected readonly mixed $resource;

    /**
     * @param TResource $resource
     */
    public function __construct(mixed $resource)
    {
        $this->resource = $resource;
    }

    /**
     * @return array<string, mixed>
     */
    abstract public function toArray(): array;

    /**
     * @return array<string, mixed>
     */
    public function resolve(): array
    {
        return $this->toArray();
    }
}
