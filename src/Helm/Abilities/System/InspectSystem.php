<?php

declare(strict_types=1);

namespace Helm\Abilities\System;

use Helm\Core\ErrorCode;
use Helm\Celestials\Celestial;
use Helm\Celestials\CelestialRepository;
use Helm\Celestials\CelestialType;
use Helm\Navigation\Contracts\NodeRepository;
use Helm\Stars\StarPost;
use Helm\Stars\StarRepository;
use WP_Error;

final class InspectSystem
{
    public function __construct(
        private readonly NodeRepository $nodes,
        private readonly CelestialRepository $celestials,
        private readonly StarRepository $stars,
    ) {
    }

    public function register(): void
    {
        wp_register_ability('helm/inspect-system', [
            'label' => __('Inspect star system', 'helm'),
            'description' => __('Read published star catalog information for a system node_id returned by ship inspection or scan targets. Returns all published stars linked to that node. Distances are from Sol, not your ship; null physical values mean unknown. This does not scan, reveal routes, or establish reachability.', 'helm'),
            'category' => 'helm',
            'input_schema' => [
                'type' => 'object',
                'properties' => ['node_id' => ['type' => 'integer', 'minimum' => 1]],
                'required' => ['node_id'],
                'additionalProperties' => false,
            ],
            'output_schema' => [
                'type' => 'object',
                'properties' => [
                    'node_id' => ['type' => 'integer'],
                    'stars' => [
                        'type' => 'array',
                        'items' => [
                            'type' => 'object',
                            'properties' => [
                                'catalog_id' => ['type' => 'string'],
                                'name' => ['type' => 'string'],
                                'spectral_type' => ['type' => 'string'],
                                'distance_from_sol_ly' => ['type' => 'number'],
                                'luminosity_solar' => ['type' => ['number', 'null']],
                                'mass_solar' => ['type' => ['number', 'null']],
                                'radius_solar' => ['type' => ['number', 'null']],
                                'temperature_k' => ['type' => ['integer', 'null']],
                                'confirmed_planet_count' => ['type' => 'integer'],
                            ],
                            'required' => [
                                'catalog_id', 'name', 'spectral_type', 'distance_from_sol_ly',
                                'luminosity_solar', 'mass_solar', 'radius_solar',
                                'temperature_k', 'confirmed_planet_count',
                            ],
                            'additionalProperties' => false,
                        ],
                    ],
                ],
                'required' => ['node_id', 'stars'],
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
        $id = (int) $input['node_id'];
        $node = $this->nodes->get($id);
        if ($node === null || ! $node->isSystem()) {
            return ErrorCode::SystemNotFound->error(__('Star system not found. Use a system node_id from ship inspection or scan targets.', 'helm'), ['status' => ErrorCode::SystemNotFound->httpStatus(), 'node_id' => $id]);
        }
        $links = $this->celestials->findByNodeIdAndType($id, CelestialType::Star);
        $stars = $this->stars->findByPostIds(array_map(static fn (Celestial $link): int => $link->contentId, $links));
        return [
            'node_id' => $id,
            'stars' => array_values(array_map(static function (StarPost $post): array {
                $star = $post->toStar();
                return [
                    'catalog_id' => $star->id, 'name' => $star->displayName(),
                    'spectral_type' => $star->spectralType,
                    'distance_from_sol_ly' => $star->distanceLy,
                    'luminosity_solar' => $star->luminosity(), 'mass_solar' => $star->mass(),
                    'radius_solar' => $star->radius(), 'temperature_k' => $star->temperature(),
                    'confirmed_planet_count' => $star->confirmedPlanetCount(),
                ];
            }, $stars)),
        ];
    }
}
