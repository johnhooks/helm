<?php

declare(strict_types=1);

namespace Helm\Lib;

use BackedEnum;
use DateTimeImmutable;
use Helm\StellarWP\Models\Model;

/**
 * Trait for repositories to hydrate and serialize models.
 *
 * Provides common patterns for:
 * - Hydrating models from database rows using Model::fromData()
 * - Serializing model values to database-compatible formats
 */
trait HydratesModels
{
    /**
     * Hydrate a model from a database row.
     *
     * Uses Model::fromData() with standard flags and syncs original values.
     *
     * @template T of Model
     * @param class-string<T> $modelClass
     * @param array<string, mixed> $row
     * @return T
     */
    protected function hydrateModel(string $modelClass, array $row): Model
    {
        $model = $modelClass::fromData(
            $row,
            Model::BUILD_MODE_IGNORE_MISSING | Model::BUILD_MODE_IGNORE_EXTRA
        );
        $model->syncOriginal();

        return $model;
    }

    /**
     * Serialize model values for database storage.
     *
     * Converts PHP types to database-compatible formats:
     * - BackedEnum → value
     * - DateTimeImmutable → 'Y-m-d H:i:s' string
     * - array → JSON string
     *
     * Skips properties that are not set on the model.
     *
     * @param array<string, mixed> $values Values to serialize (e.g. $model->toArray() or $model->getDirty())
     * @param Model $model The model instance (for isSet() checks)
     * @param array<string, string> $columnMap Map of property names to column names (e.g. ['type' => 'action_type'])
     * @return array<string, mixed>
     */
    protected function serializeToDbRow(array $values, Model $model, array $columnMap = []): array
    {
        $row = [];

        foreach ($values as $key => $value) {
            // Skip unset properties - let database defaults apply
            if (!$model->isSet($key)) {
                continue;
            }

            // Skip null id on insert (auto-increment)
            if ($key === 'id' && $value === null) {
                continue;
            }

            // Map property name to column name if needed
            $columnName = $columnMap[$key] ?? $key;

            $row[$columnName] = match (true) {
                $value instanceof BackedEnum => $value->value,
                $value instanceof DateTimeImmutable => $value->format('Y-m-d H:i:s'),
                is_array($value) => json_encode($value, JSON_THROW_ON_ERROR),
                default => $value,
            };
        }

        return $row;
    }
}
