<?php

declare(strict_types=1);

namespace Helm\Abilities\System;

use Helm\Abilities\Support\Schemas;
use Helm\Products\Contracts\ProductRepository;
use Helm\Products\Models\Product;
use WP_Error;

final class ListProducts
{
    public function __construct(
        private readonly ProductRepository $products,
    ) {
    }

    public function register(): void
    {
        wp_register_ability('helm/list-products', [
            'label' => __('Browse product catalog', 'helm'),
            'description' => __('List component blueprints, optionally filtered by type. Includes all catalog versions, sorted by product ID. These are designs, not owned inventory or market availability. Use get-product for stats.', 'helm'),
            'category' => 'helm',
            'input_schema' => [
                'type' => 'object',
                'properties' => [
                    'type' => ['type' => 'string', 'enum' => ['core', 'drive', 'sensor', 'shield', 'nav']],
                    'page' => ['type' => 'integer', 'minimum' => 1, 'default' => 1],
                    'per_page' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 100, 'default' => 20],
                ],
                'required' => [],
                'additionalProperties' => false,
            ],
            'output_schema' => Schemas::collection('products', [
                    'type' => 'object',
                    'properties' => [
                        'product_id' => ['type' => 'integer'], 'slug' => ['type' => 'string'],
                        'label' => ['type' => 'string'], 'type' => ['type' => 'string'],
                        'version' => ['type' => 'integer'],
                    ],
                    'required' => ['product_id', 'slug', 'label', 'type', 'version'],
                    'additionalProperties' => false,
                ]),
            'execute_callback' => [$this, 'execute'],
            'permission_callback' => [$this, 'canExecute'],
            'meta' => [
                'show_in_rest' => true,
                'public' => true,
                'mcp' => ['public' => true],
                'annotations' => ['readonly' => true, 'destructive' => false, 'idempotent' => true],
            ],
        ]);
    }

    public function canExecute(): bool
    {
        return is_user_logged_in();
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>|WP_Error
     */
    public function execute(array $input): array|WP_Error
    {
        $products = isset($input['type']) ? $this->products->findAllByType($input['type']) : $this->products->findAll();
        usort($products, static fn (Product $a, Product $b): int => $a->id <=> $b->id);
        $page = (int) ($input['page'] ?? 1);
        $perPage = (int) ($input['per_page'] ?? 20);
        return [
            'products' => array_map(static fn (Product $product): array => [
                'product_id' => $product->id, 'slug' => $product->slug,
                'label' => $product->label, 'type' => $product->type, 'version' => $product->version,
            ], array_slice($products, ($page - 1) * $perPage, $perPage)),
            'total' => count($products), 'page' => $page,
            'has_more' => $page * $perPage < count($products),
        ];
    }
}
