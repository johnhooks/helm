<?php

declare(strict_types=1);

namespace Tests\Wpunit\View;

use Helm\View\ViewNotFoundException;
use Helm\View\ViewRenderer;
use Tests\Support\WpunitTester;

/**
 * @covers \Helm\View\ViewRenderer
 */
class ViewRendererTest extends \Codeception\Test\Unit
{
    protected WpunitTester $tester;

    private ViewRenderer $view;
    private string $viewsDir;

    public function _before(): void
    {
        parent::_before();

        $this->viewsDir = dirname(__DIR__, 2) . '/_data/views';
        $this->view = new ViewRenderer($this->viewsDir);
    }

    // ========================================
    // toString() Tests
    // ========================================

    public function test_to_string_renders_view(): void
    {
        $result = $this->view->toString('simple', [
            'name' => 'World',
            'count' => 42,
        ]);

        $this->assertStringContainsString('Hello, World!', $result);
        $this->assertStringContainsString('Count: 42', $result);
    }

    public function test_to_string_extracts_variables(): void
    {
        $result = $this->view->toString('simple', [
            'name' => 'Test User',
            'count' => 100,
        ]);

        $this->assertStringContainsString('Test User', $result);
        $this->assertStringContainsString('100', $result);
    }

    public function test_to_string_handles_nested_views(): void
    {
        $result = $this->view->toString('nested/deep', [
            'value' => 'nested content',
        ]);

        $this->assertStringContainsString('<span>nested content</span>', $result);
    }

    public function test_to_string_throws_for_missing_view(): void
    {
        $this->expectException(ViewNotFoundException::class);
        $this->expectExceptionMessage('View file');

        $this->view->toString('nonexistent');
    }

    public function test_to_string_cleans_up_output_buffer_on_exception(): void
    {
        $levelBefore = ob_get_level();

        try {
            $this->view->toString('throws');
            $this->fail('Expected exception was not thrown');
        } catch (\RuntimeException $e) {
            $this->assertEquals('Test exception', $e->getMessage());
        }

        $levelAfter = ob_get_level();
        $this->assertEquals($levelBefore, $levelAfter, 'Output buffer level should be restored after exception');
    }

    // ========================================
    // render() Tests
    // ========================================

    public function test_render_outputs_content(): void
    {
        ob_start();
        $this->view->render('simple', [
            'name' => 'Output',
            'count' => 5,
        ]);
        $output = ob_get_clean();

        $this->assertStringContainsString('Hello, Output!', $output);
        $this->assertStringContainsString('Count: 5', $output);
    }

    // ========================================
    // Custom Extension Tests
    // ========================================

    public function test_custom_extension(): void
    {
        // Create a view with custom extension
        $customDir = $this->viewsDir;
        file_put_contents($customDir . '/custom.html', '<div>Custom extension</div>');

        try {
            $view = new ViewRenderer($customDir, '.html');
            $result = $view->toString('custom');

            $this->assertStringContainsString('<div>Custom extension</div>', $result);
        } finally {
            unlink($customDir . '/custom.html');
        }
    }

    // ========================================
    // Edge Cases
    // ========================================

    public function test_empty_args_renders_without_variables(): void
    {
        // Create a view that doesn't need variables
        $noVarsContent = '<?php echo "No variables needed"; ?>';
        file_put_contents($this->viewsDir . '/no-vars.php', $noVarsContent);

        try {
            $result = $this->view->toString('no-vars');
            $this->assertEquals('No variables needed', $result);
        } finally {
            unlink($this->viewsDir . '/no-vars.php');
        }
    }

    public function test_special_characters_in_variables_are_preserved(): void
    {
        $result = $this->view->toString('simple', [
            'name' => '<script>alert("xss")</script>',
            'count' => 0,
        ]);

        // The view uses esc_html, so special chars should be escaped
        $this->assertStringContainsString('&lt;script&gt;', $result);
        $this->assertStringNotContainsString('<script>', $result);
    }
}
