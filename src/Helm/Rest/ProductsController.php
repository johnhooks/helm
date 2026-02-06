<?php

declare(strict_types=1);

namespace Helm\Rest;

use Helm\Core\ErrorCode;
use Helm\Products\Models\Product;
use Helm\Products\ProductRepository;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;

/**
 * REST controller for products (catalog).
 *
 * GET /helm/v1/products - List all products
 * GET /helm/v1/products/{id} - Get single product
 */
final class ProductsController
{
    private const NAMESPACE = 'helm/v1';

    public function __construct(
        private readonly ProductRepository $repository,
    ) {
    }

    /**
     * Register REST routes.
     */
    public function register(): void
    {
        register_rest_route(
            self::NAMESPACE,
            '/products',
            [
                'methods'             => 'GET',
                'callback'            => [$this, 'index'],
                'permission_callback' => '__return_true',
                'args'                => [
                    'type' => [
                        'description' => __('Filter by product type.', 'helm'),
                        'type'        => 'string',
                        'enum'        => ['core', 'drive', 'sensor', 'shield', 'nav'],
                    ],
                ],
            ]
        );

        register_rest_route(
            self::NAMESPACE,
            '/products/(?P<id>\d+)',
            [
                'methods'             => 'GET',
                'callback'            => [$this, 'show'],
                'permission_callback' => '__return_true',
            ]
        );
    }

    /**
     * List products.
     *
     * @param WP_REST_Request<array<string, mixed>> $request
     * @return WP_REST_Response
     */
    public function index(WP_REST_Request $request): WP_REST_Response
    {
        $type = $request->get_param('type');

        if ($type !== null) {
            $products = $this->repository->findAllByType($type);
        } else {
            $products = $this->repository->findAll();
        }

        $data = array_map(
            fn (Product $product) => $this->serializeProduct($product, $request),
            $products
        );

        return new WP_REST_Response($data);
    }

    /**
     * Get single product.
     *
     * @param WP_REST_Request<array<string, mixed>> $request
     * @return WP_REST_Response|WP_Error
     */
    public function show(WP_REST_Request $request)
    {
        $id = (int) $request->get_param('id');
        $product = $this->repository->find($id);

        if ($product === null) {
            return ErrorCode::ProductNotFound->error(
                __('Product not found.', 'helm'),
                ['status' => ErrorCode::ProductNotFound->httpStatus()]
            );
        }

        $response = new WP_REST_Response($this->serializeProduct($product, $request));
        $response->add_links($this->prepareLinks($product));

        return $response;
    }

    /**
     * Serialize a product for JSON response.
     *
     * @param WP_REST_Request<array<string, mixed>> $request
     * @return array<string, mixed>
     */
    private function serializeProduct(Product $product, WP_REST_Request $request): array
    {
        $context = $request->get_param('context') ?? 'view';

        // Minimal data for embed context
        $data = [
            'id'    => $product->id,
            'slug'  => $product->slug,
            'type'  => $product->type,
            'label' => $product->label,
        ];

        // Full data for view/edit context
        if ($context !== 'embed') {
            $data['version'] = $product->version;
            $data['hp'] = $product->hp;
            $data['footprint'] = $product->footprint;
            $data['stats'] = $this->serializeStats($product);
        }

        return $data;
    }

    /**
     * Serialize product stats based on type.
     *
     * @return array<string, float|null>
     */
    private function serializeStats(Product $product): array
    {
        return match ($product->type) {
            'core' => [
                'regen_rate'    => $product->rate,
                'output'        => $product->mult_a,
                'jump_cost'     => $product->mult_b,
            ],
            'drive' => [
                'sustain'       => $product->range,
                'speed'         => $product->mult_a,
                'consumption'   => $product->mult_b,
                'amplitude'     => $product->mult_c,
            ],
            'sensor' => [
                'range'         => $product->range,
                'success'       => $product->chance,
                'duration_mult' => $product->mult_a,
            ],
            'shield' => [
                'regen_rate'    => $product->rate,
                'capacity'      => $product->capacity,
            ],
            'nav' => [
                'skill'         => $product->mult_a,
                'efficiency'    => $product->mult_b,
            ],
            default => [
                'rate'     => $product->rate,
                'range'    => $product->range,
                'capacity' => $product->capacity,
                'chance'   => $product->chance,
                'mult_a'   => $product->mult_a,
                'mult_b'   => $product->mult_b,
                'mult_c'   => $product->mult_c,
            ],
        };
    }

    /**
     * Prepare links for a product.
     *
     * @return array<string, array<string, mixed>>
     */
    private function prepareLinks(Product $product): array
    {
        return [
            'self' => [
                'href' => rest_url(self::NAMESPACE . '/products/' . $product->id),
            ],
            'collection' => [
                'href' => rest_url(self::NAMESPACE . '/products'),
            ],
        ];
    }
}
