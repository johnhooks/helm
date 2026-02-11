<?php

declare(strict_types=1);

namespace Tests\Wpunit\Rest;

use Helm\Products\ProductRepository;
use lucatume\WPBrowser\TestCase\WPRestApiTestCase;
use Tests\Support\WpunitTester;
use WP_REST_Request;

/**
 * @covers \Helm\Rest\ProductsController
 *
 * @property WpunitTester $tester
 */
class ProductsControllerTest extends WPRestApiTestCase
{
    private ProductRepository $productRepository;

    public function _before(): void
    {
        parent::_before();
        $this->productRepository = helm(ProductRepository::class);
    }

    public function test_list_products_returns_all(): void
    {
        $request = new WP_REST_Request('GET', '/helm/v1/products');
        $response = rest_do_request($request);

        $this->assertSame(200, $response->get_status());

        $data = $response->get_data();
        $this->assertIsArray($data);
        $this->assertNotEmpty($data);

        // Verify structure of first product
        $first = $data[0];
        $this->assertArrayHasKey('id', $first);
        $this->assertArrayHasKey('slug', $first);
        $this->assertArrayHasKey('type', $first);
        $this->assertArrayHasKey('label', $first);
    }

    public function test_list_products_filters_by_type(): void
    {
        $request = new WP_REST_Request('GET', '/helm/v1/products');
        $request->set_param('type', 'core');
        $response = rest_do_request($request);

        $this->assertSame(200, $response->get_status());

        $data = $response->get_data();
        $this->assertNotEmpty($data);

        // All should be cores
        foreach ($data as $product) {
            $this->assertSame('core', $product['type']);
        }
    }

    public function test_get_single_product(): void
    {
        // Get a known product
        $product = $this->productRepository->findBySlug('epoch_s');
        $this->assertNotNull($product);

        $request = new WP_REST_Request('GET', '/helm/v1/products/' . $product->id);
        $response = rest_do_request($request);

        $this->assertSame(200, $response->get_status());

        $data = $response->get_data();
        $this->assertSame($product->id, $data['id']);
        $this->assertSame('epoch_s', $data['slug']);
        $this->assertSame('core', $data['type']);
        $this->assertSame('Epoch-S Standard', $data['label']);

        // Full context should include stat columns
        $this->assertArrayHasKey('rate', $data);
    }

    public function test_get_single_product_not_found(): void
    {
        $request = new WP_REST_Request('GET', '/helm/v1/products/999999');
        $response = rest_do_request($request);

        $this->assertErrorResponse('helm.product.not_found', $response, 404);
    }

    public function test_get_product_embed_context(): void
    {
        $product = $this->productRepository->findBySlug('epoch_s');
        $this->assertNotNull($product);

        $request = new WP_REST_Request('GET', '/helm/v1/products/' . $product->id);
        $request->set_param('context', 'embed');
        $response = rest_do_request($request);

        $this->assertSame(200, $response->get_status());

        $data = $response->get_data();

        // Embed context returns full product data (same as view)
        $this->assertSame($product->id, $data['id']);
        $this->assertSame('epoch_s', $data['slug']);
        $this->assertSame('core', $data['type']);
        $this->assertSame('Epoch-S Standard', $data['label']);
        $this->assertArrayHasKey('rate', $data);
        $this->assertArrayHasKey('version', $data);
    }

    public function test_single_product_has_links(): void
    {
        $product = $this->productRepository->findBySlug('epoch_s');
        $this->assertNotNull($product);

        $request = new WP_REST_Request('GET', '/helm/v1/products/' . $product->id);
        $response = rest_do_request($request);

        $links = $response->get_links();

        $this->assertArrayHasKey('self', $links);
        $this->assertArrayHasKey('collection', $links);
    }

    public function test_products_public_access(): void
    {
        // Products should be accessible without authentication
        wp_set_current_user(0);

        $request = new WP_REST_Request('GET', '/helm/v1/products');
        $response = rest_do_request($request);

        $this->assertSame(200, $response->get_status());
    }

    public function test_core_stats_structure(): void
    {
        $product = $this->productRepository->findBySlug('epoch_s');
        $this->assertNotNull($product);

        $request = new WP_REST_Request('GET', '/helm/v1/products/' . $product->id);
        $response = rest_do_request($request);

        $data = $response->get_data();

        $this->assertArrayHasKey('rate', $data);
        $this->assertArrayHasKey('mult_a', $data);
        $this->assertArrayHasKey('mult_b', $data);
    }

    public function test_drive_stats_structure(): void
    {
        $product = $this->productRepository->findBySlug('dr_505');
        $this->assertNotNull($product);

        $request = new WP_REST_Request('GET', '/helm/v1/products/' . $product->id);
        $response = rest_do_request($request);

        $data = $response->get_data();

        $this->assertArrayHasKey('range', $data);
        $this->assertArrayHasKey('mult_a', $data);
        $this->assertArrayHasKey('mult_b', $data);
        $this->assertArrayHasKey('mult_c', $data);
    }

    public function test_sensor_stats_structure(): void
    {
        $product = $this->productRepository->findBySlug('vrs_mk1');
        $this->assertNotNull($product);

        $request = new WP_REST_Request('GET', '/helm/v1/products/' . $product->id);
        $response = rest_do_request($request);

        $data = $response->get_data();

        $this->assertArrayHasKey('range', $data);
        $this->assertArrayHasKey('chance', $data);
        $this->assertArrayHasKey('mult_a', $data);
    }
}
