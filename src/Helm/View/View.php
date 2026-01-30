<?php

declare(strict_types=1);

namespace Helm\View;

/**
 * View renderer contract.
 */
interface View
{
    /**
     * Render a view file.
     *
     * @param string $name View name (e.g., 'admin/metaboxes/star-properties')
     * @param array<string, mixed> $args Variables to extract into the view
     */
    public function render(string $name, array $args = []): void;

    /**
     * Render a view file and return as string.
     *
     * @param string $name View name (e.g., 'admin/metaboxes/star-properties')
     * @param array<string, mixed> $args Variables to extract into the view
     * @return string Rendered output
     */
    public function toString(string $name, array $args = []): string;
}
