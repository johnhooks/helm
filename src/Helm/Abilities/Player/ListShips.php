<?php

declare(strict_types=1);

namespace Helm\Abilities\Player;

use Helm\Abilities\Support\Schemas;
use Helm\PostTypes\PostTypeRegistry;
use WP_Post;
use WP_Query;

final class ListShips
{
    public function register(): void
    {
        $id = ['type' => 'integer', 'minimum' => 1];
        $page = ['type' => 'integer', 'minimum' => 1, 'default' => 1];
        $perPage = ['type' => 'integer', 'minimum' => 1, 'maximum' => 100, 'default' => 20];

        wp_register_ability('helm/list-ships', [
            'label' => __('List my ships', 'helm'),
            'description' => __('List ships owned by the authenticated player. Use the returned ship_id with the other Helm abilities.', 'helm'),
            'category' => 'helm',
            'input_schema' => [
                'type' => 'object',
                'properties' => ['page' => $page, 'per_page' => $perPage],
                'required' => [],
                'additionalProperties' => false,
            ],
            'output_schema' => Schemas::collection('ships', [
                'type' => 'object',
                'properties' => ['ship_id' => $id, 'name' => ['type' => 'string']],
                'required' => ['ship_id', 'name'],
            ]),
            'execute_callback' => [$this, 'execute'],
            'permission_callback' => [$this, 'canExecute'],
            'meta' => [
                'show_in_rest' => true,
                'public' => true,
                'mcp' => ['public' => true],
                'annotations' => [
                    'readonly' => true,
                    'destructive' => false,
                    'idempotent' => true,
                ],
            ],
        ]);
    }

    public function canExecute(): bool
    {
        return is_user_logged_in();
    }

    /**
     * @param array<string, mixed> $input
     * @return array<string, mixed>
     */
    public function execute(array $input): array
    {
        $page = (int) ($input['page'] ?? 1);
        $perPage = (int) ($input['per_page'] ?? 20);
        $query = new WP_Query([
            'post_type' => PostTypeRegistry::POST_TYPE_SHIP,
            'author' => get_current_user_id(),
            'post_status' => 'publish',
            'posts_per_page' => $perPage,
            'paged' => $page,
            'orderby' => 'ID', 'order' => 'ASC',
        ]);
        return [
            'ships' => array_map(static fn (WP_Post $post): array => [
                'ship_id' => $post->ID, 'name' => $post->post_title,
            ], $query->posts),
            'total' => $query->found_posts,
            'page' => $page,
            'has_more' => $page < $query->max_num_pages,
        ];
    }
}
