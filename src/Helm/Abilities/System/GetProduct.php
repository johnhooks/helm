<?php

declare(strict_types=1);

namespace Helm\Abilities\System;

use Helm\Core\ErrorCode;
use Helm\Products\Contracts\ProductRepository;
use WP_Error;

final class GetProduct
{
    public function __construct(
        private readonly ProductRepository $products,
    ) {
    }

    public function register(): void
    {
        wp_register_ability('helm/get-product', [
            'label' => __('Inspect product blueprint', 'helm'),
            'description' => __('Read one exact product version by product_id from list-products. Raw stats match the product REST API. Meanings depend on type: core rate=regen, mult_a=output, mult_b=cost; drive range=sustain, mult_a=speed, mult_b=consumption, mult_c=amplitude, mult_d=transit shield fraction; sensor range=range, chance=success, mult_a=duration, mult_d=core resonance split; shield rate=regen, capacity=capacity, mult_d=sensor range bonus; nav mult_a=skill, mult_b=efficiency. Null means unspecified. These are blueprint stats, not effective installed-ship readings.', 'helm'),
            'category' => 'helm',
            'input_schema' => [
                'type' => 'object',
                'properties' => ['product_id' => ['type' => 'integer', 'minimum' => 1]],
                'required' => ['product_id'],
                'additionalProperties' => false,
            ],
            'output_schema' => [
                'type' => 'object',
                'properties' => [
                    'product_id' => ['type' => 'integer'],
                    'slug' => ['type' => 'string'],
                    'label' => ['type' => 'string'],
                    'type' => ['type' => 'string'],
                    'version' => ['type' => 'integer'],
                    'hp' => ['type' => ['integer', 'null']],
                    'footprint' => ['type' => 'integer'],
                    'rate' => ['type' => ['number', 'null']],
                    'range' => ['type' => ['number', 'null']],
                    'capacity' => ['type' => ['number', 'null']],
                    'chance' => ['type' => ['number', 'null']],
                    'mult_a' => ['type' => ['number', 'null']],
                    'mult_b' => ['type' => ['number', 'null']],
                    'mult_c' => ['type' => ['number', 'null']],
                    'mult_d' => ['type' => ['number', 'null']],
                    'mult_e' => ['type' => ['number', 'null']],
                    'mult_f' => ['type' => ['number', 'null']],
                ],
                'required' => ['product_id', 'slug', 'label', 'type', 'version', 'hp', 'footprint', 'rate', 'range', 'capacity', 'chance', 'mult_a', 'mult_b', 'mult_c', 'mult_d', 'mult_e', 'mult_f'],
                'additionalProperties' => false,
            ],
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
        $id = (int) $input['product_id'];
        $product = $this->products->find($id);
        if ($product === null) {
            return ErrorCode::ProductNotFound->error(__('Product not found. Use helm/list-products to find a catalog ID.', 'helm'), ['status' => ErrorCode::ProductNotFound->httpStatus(), 'product_id' => $id]);
        }
        return [
            'product_id' => $product->id,
            'slug' => $product->slug,
            'label' => $product->label,
            'type' => $product->type,
            'version' => $product->version,
            'hp' => $product->hp,
            'footprint' => $product->footprint,
            'rate' => $product->rate,
            'range' => $product->range,
            'capacity' => $product->capacity,
            'chance' => $product->chance,
            'mult_a' => $product->mult_a,
            'mult_b' => $product->mult_b,
            'mult_c' => $product->mult_c,
            'mult_d' => $product->mult_d,
            'mult_e' => $product->mult_e,
            'mult_f' => $product->mult_f,
        ];
    }
}
