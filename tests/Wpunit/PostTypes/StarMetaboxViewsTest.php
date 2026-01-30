<?php

declare(strict_types=1);

namespace Tests\Wpunit\PostTypes;

use Helm\Stars\Star;
use Helm\View\View;
use tad\Codeception\SnapshotAssertions\SnapshotAssertions;
use Tests\Support\WpunitTester;

/**
 * Snapshot tests for Star metabox views.
 *
 * @covers \Helm\PostTypes\StarMetaBoxes
 */
class StarMetaboxViewsTest extends \Codeception\Test\Unit
{
    use SnapshotAssertions;

    protected WpunitTester $tester;

    private View $view;

    public function _before(): void
    {
        parent::_before();
        $this->view = helm(View::class);
    }

    // ========================================
    // Star Properties View
    // ========================================

    public function test_star_properties_view_with_full_data(): void
    {
        $star = new Star(
            id: 'HIP_70890',
            name: 'Proxima Centauri',
            spectralType: 'M5.5Ve',
            distanceLy: 4.2465,
            ra: 217.4289,
            dec: -62.6794,
            properties: [
                'luminosity_solar' => 0.0017,
                'constellation' => 'Centaurus',
            ],
        );

        $html = $this->view->toString('admin/metaboxes/star-properties', [
            'star' => $star,
        ]);

        $this->assertMatchesHtmlSnapshot($this->normalizeHtml($html));
    }

    public function test_star_properties_view_with_minimal_data(): void
    {
        $star = new Star(
            id: 'HIP_12345',
            name: null,
            spectralType: '',
            distanceLy: 100.0,
            ra: 0.0,
            dec: 0.0,
        );

        $html = $this->view->toString('admin/metaboxes/star-properties', [
            'star' => $star,
        ]);

        $this->assertMatchesHtmlSnapshot($this->normalizeHtml($html));
    }

    public function test_star_properties_view_sol(): void
    {
        $star = new Star(
            id: 'SOL',
            name: 'Sun',
            spectralType: 'G2V',
            distanceLy: 0.0,
            ra: 0.0,
            dec: 0.0,
            properties: [
                'luminosity_solar' => 1.0,
            ],
        );

        $html = $this->view->toString('admin/metaboxes/star-properties', [
            'star' => $star,
        ]);

        $this->assertMatchesHtmlSnapshot($this->normalizeHtml($html));
    }

    // ========================================
    // Star System View
    // ========================================

    public function test_star_system_view_with_no_planets(): void
    {
        $html = $this->view->toString('admin/metaboxes/star-system', [
            'planets' => [],
            'originInitialized' => false,
            'generateUrl' => null,
        ]);

        $this->assertMatchesHtmlSnapshot($this->normalizeHtml($html));
    }

    public function test_star_system_view_with_origin_initialized(): void
    {
        $html = $this->view->toString('admin/metaboxes/star-system', [
            'planets' => [],
            'originInitialized' => true,
            'generateUrl' => 'https://example.com/admin-post.php?action=generate',
        ]);

        $this->assertMatchesHtmlSnapshot($this->normalizeHtml($html));
    }

    // ========================================
    // Star Discovery View
    // ========================================

    public function test_star_discovery_view_undiscovered(): void
    {
        $html = $this->view->toString('admin/metaboxes/star-discovery', [
            'isDiscovered' => false,
            'count' => 0,
            'isKnownSpace' => false,
            'firstDiscoverer' => null,
        ]);

        $this->assertMatchesHtmlSnapshot($this->normalizeHtml($html));
    }

    public function test_star_discovery_view_discovered(): void
    {
        $html = $this->view->toString('admin/metaboxes/star-discovery', [
            'isDiscovered' => true,
            'count' => 42,
            'isKnownSpace' => true,
            'firstDiscoverer' => 'Captain Kirk',
        ]);

        $this->assertMatchesHtmlSnapshot($this->normalizeHtml($html));
    }

    public function test_star_discovery_view_discovered_without_first_discoverer(): void
    {
        $html = $this->view->toString('admin/metaboxes/star-discovery', [
            'isDiscovered' => true,
            'count' => 5,
            'isKnownSpace' => false,
            'firstDiscoverer' => null,
        ]);

        $this->assertMatchesHtmlSnapshot($this->normalizeHtml($html));
    }

    // ========================================
    // Star Navigation View
    // ========================================

    public function test_star_navigation_view_with_node(): void
    {
        $html = $this->view->toString('admin/metaboxes/star-navigation', [
            'nodeId' => 123,
            'coords' => [1.5, 2.8, -1.2],
        ]);

        $this->assertMatchesHtmlSnapshot($this->normalizeHtml($html));
    }

    public function test_star_navigation_view_without_node(): void
    {
        $html = $this->view->toString('admin/metaboxes/star-navigation', [
            'nodeId' => null,
            'coords' => [0.0, 0.0, 0.0],
        ]);

        $this->assertMatchesHtmlSnapshot($this->normalizeHtml($html));
    }

    // ========================================
    // Helpers
    // ========================================

    /**
     * Normalize HTML for consistent snapshot comparison.
     *
     * Removes extra whitespace while preserving structure.
     */
    private function normalizeHtml(string $html): string
    {
        // Remove leading/trailing whitespace from lines
        $lines = array_map('trim', explode("\n", $html));

        // Remove empty lines
        $lines = array_filter($lines, fn($line) => $line !== '');

        return implode("\n", $lines);
    }
}
