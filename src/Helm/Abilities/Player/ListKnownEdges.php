<?php

declare(strict_types=1);

namespace Helm\Abilities\Player;

use Helm\Abilities\Support\Schemas;
use Helm\Navigation\Contracts\UserEdgeRepository;
use Helm\Navigation\UserEdge;

final class ListKnownEdges
{
    public function __construct(
        private readonly UserEdgeRepository $edges,
    ) {
    }

    public function register(): void
    {
        $id = ['type' => 'integer', 'minimum' => 1];
        $page = ['type' => 'integer', 'minimum' => 1, 'default' => 1];
        $perPage = ['type' => 'integer', 'minimum' => 1, 'maximum' => 100, 'default' => 20];

        wp_register_ability('helm/list-known-edges', [
            'label' => __('List my discovered routes', 'helm'),
            'description' => __('List only the authenticated player\'s discovered navigation edges. Edges connect node_a_id and node_b_id in either direction. Supply an ordered, connected list of their IDs when submitting a jump. Read every page when planning a multi-leg route.', 'helm'),
            'category' => 'helm',
            'input_schema' => [
                'type' => 'object',
                'properties' => ['page' => $page, 'per_page' => $perPage],
                'required' => [],
                'additionalProperties' => false,
            ],
            'output_schema' => Schemas::collection('edges', [
                'type' => 'object',
                'properties' => ['id' => $id, 'node_a_id' => $id, 'node_b_id' => $id, 'distance_ly' => ['type' => 'number']],
                'required' => ['id', 'node_a_id', 'node_b_id', 'distance_ly'],
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
        $result = $this->edges->paginate(get_current_user_id(), $page, $perPage);
        return [
            'edges' => array_map(static fn (UserEdge $edge): array => [
                'id' => $edge->edgeId, 'node_a_id' => $edge->nodeAId,
                'node_b_id' => $edge->nodeBId, 'distance_ly' => $edge->distance,
            ], $result['edges']),
            'total' => $result['total'], 'page' => $page,
            'has_more' => $page * $perPage < $result['total'],
        ];
    }
}
