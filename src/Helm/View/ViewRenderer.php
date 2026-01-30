<?php

declare(strict_types=1);

namespace Helm\View;

/**
 * Simple PHP view renderer.
 *
 * Renders PHP template files with extracted variables.
 */
final class ViewRenderer implements View
{
    /**
     * @param string $directory Absolute path to views directory
     * @param string $extension File extension for view files
     */
    public function __construct(
        private readonly string $directory,
        private readonly string $extension = '.php',
    ) {
    }

    /**
     * Render a view file.
     *
     * @param string $name View name (e.g., 'admin/metaboxes/star-properties')
     * @param array<string, mixed> $args Variables to extract into the view
     */
    public function render(string $name, array $args = []): void
    {
        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Views handle their own escaping
        echo $this->toString($name, $args);
    }

    /**
     * Render a view file and return as string.
     *
     * @param string $name View name (e.g., 'admin/metaboxes/star-properties')
     * @param array<string, mixed> $args Variables to extract into the view
     * @return string Rendered output
     * @throws ViewNotFoundException If view file doesn't exist
     */
    public function toString(string $name, array $args = []): string
    {
        $file = $this->getPath($name);

        $level = ob_get_level();

        try {
            ob_start();

            // Extract args so they're available as variables in the view
            // phpcs:ignore WordPress.PHP.DontExtract.extract_extract -- Intentional for view rendering
            extract($args);

            include $file;

            return (string) ob_get_clean();
        } catch (\Throwable $e) {
            // Clean up any output buffers we started
            while (ob_get_level() > $level) {
                ob_end_clean();
            }

            throw $e;
        }
    }

    /**
     * Get the absolute path to a view file.
     *
     * @throws ViewNotFoundException If view file doesn't exist
     */
    private function getPath(string $name): string
    {
        $file = $this->directory . '/' . $name . $this->extension;
        $path = realpath($file);

        if ($path === false) {
            throw new ViewNotFoundException(
                sprintf('View file "%s" not found.', $file)
            );
        }

        return $path;
    }
}
