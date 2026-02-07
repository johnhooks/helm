<?php

declare(strict_types=1);

namespace Helm\Celestials;

use Helm\Database\Schema;

/**
 * Repository for celestial links.
 */
final class CelestialRepository
{
    /**
     * Find a celestial by ID.
     */
    public function get(int $id): ?Celestial
    {
        global $wpdb;

        $row = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM %i WHERE id = %d",
                Schema::table(Schema::TABLE_CELESTIALS),
                $id
            ),
            ARRAY_A
        );

        return $row ? Celestial::fromRow($row) : null;
    }

    /**
     * Find all celestials for a node.
     *
     * @return Celestial[]
     */
    public function findByNodeId(int $nodeId): array
    {
        global $wpdb;

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM %i WHERE node_id = %d ORDER BY id",
                Schema::table(Schema::TABLE_CELESTIALS),
                $nodeId
            ),
            ARRAY_A
        );

        return array_map(fn($row) => Celestial::fromRow($row), $rows);
    }

    /**
     * Find celestials by type for a node.
     *
     * @return Celestial[]
     */
    public function findByNodeIdAndType(int $nodeId, CelestialType $type): array
    {
        global $wpdb;

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM %i WHERE node_id = %d AND content_type = %s ORDER BY id",
                Schema::table(Schema::TABLE_CELESTIALS),
                $nodeId,
                $type->value
            ),
            ARRAY_A
        );

        return array_map(fn($row) => Celestial::fromRow($row), $rows);
    }

    /**
     * Find a celestial by content.
     */
    public function findByContent(CelestialType $type, int $contentId): ?Celestial
    {
        global $wpdb;

        $row = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM %i WHERE content_type = %s AND content_id = %d",
                Schema::table(Schema::TABLE_CELESTIALS),
                $type->value,
                $contentId
            ),
            ARRAY_A
        );

        return $row ? Celestial::fromRow($row) : null;
    }

    /**
     * Link content to a node.
     */
    public function link(int $nodeId, CelestialType $type, int $contentId): Celestial
    {
        global $wpdb;

        // Check if already exists
        $existing = $this->findExact($nodeId, $type, $contentId);
        if ($existing !== null) {
            return $existing;
        }

        $data = [
            'node_id' => $nodeId,
            'content_type' => $type->value,
            'content_id' => $contentId,
        ];

        $result = $wpdb->insert(Schema::table(Schema::TABLE_CELESTIALS), $data);

        if ($result === false) {
            throw new \RuntimeException('Failed to insert celestial link.');
        }

        return $this->get((int) $wpdb->insert_id);
    }

    /**
     * Unlink content from a node.
     */
    public function unlink(int $nodeId, CelestialType $type, int $contentId): bool
    {
        global $wpdb;

        $result = $wpdb->delete(
            Schema::table(Schema::TABLE_CELESTIALS),
            [
                'node_id' => $nodeId,
                'content_type' => $type->value,
                'content_id' => $contentId,
            ],
            ['%d', '%s', '%d']
        );

        return $result !== false;
    }

    /**
     * Delete all celestials for a node.
     */
    public function deleteByNodeId(int $nodeId): int
    {
        global $wpdb;

        $result = $wpdb->delete(
            Schema::table(Schema::TABLE_CELESTIALS),
            ['node_id' => $nodeId],
            ['%d']
        );

        return $result !== false ? $result : 0;
    }

    /**
     * Delete all celestials for content.
     */
    public function deleteByContent(CelestialType $type, int $contentId): int
    {
        global $wpdb;

        $result = $wpdb->delete(
            Schema::table(Schema::TABLE_CELESTIALS),
            [
                'content_type' => $type->value,
                'content_id' => $contentId,
            ],
            ['%s', '%d']
        );

        return $result !== false ? $result : 0;
    }

    /**
     * Find exact match.
     */
    private function findExact(int $nodeId, CelestialType $type, int $contentId): ?Celestial
    {
        global $wpdb;

        $row = $wpdb->get_row(
            $wpdb->prepare(
                "SELECT * FROM %i WHERE node_id = %d AND content_type = %s AND content_id = %d",
                Schema::table(Schema::TABLE_CELESTIALS),
                $nodeId,
                $type->value,
                $contentId
            ),
            ARRAY_A
        );

        return $row ? Celestial::fromRow($row) : null;
    }

    /**
     * Count celestials by type.
     */
    public function countByType(CelestialType $type): int
    {
        global $wpdb;

        return (int) $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM %i WHERE content_type = %s",
                Schema::table(Schema::TABLE_CELESTIALS),
                $type->value
            )
        );
    }
}
