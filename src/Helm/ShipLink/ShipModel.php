<?php

declare(strict_types=1);

namespace Helm\ShipLink;

use DateTimeImmutable;
use Helm\Ships\ShipPost;
use Helm\ShipLink\Components\CoreType;
use Helm\ShipLink\Components\DriveType;
use Helm\ShipLink\Components\NavTier;
use Helm\ShipLink\Components\SensorType;
use Helm\ShipLink\Components\ShieldType;

/**
 * Mutable ship model for processing.
 *
 * Combines data from the Ship CPT and ship systems table.
 * Systems mutate this model during action processing.
 */
final class ShipModel
{
    // Identity (from CPT)
    public int $postId;
    public string $name;
    public int $ownerId;

    // Components (from systems table)
    public CoreType $coreType;
    public DriveType $driveType;
    public SensorType $sensorType;
    public ShieldType $shieldType;
    public NavTier $navTier;

    // Regenerating resources
    public ?DateTimeImmutable $powerFullAt;
    public float $powerMax;
    public ?DateTimeImmutable $shieldsFullAt;
    public float $shieldsMax;

    // Static state
    public float $coreLife;
    public float $hullIntegrity;
    public float $hullMax;

    // Position & activity
    public ?int $nodeId;
    /** @var array<string, int> */
    public array $cargo;
    public ?int $currentActionId;

    // Timestamps
    public DateTimeImmutable $createdAt;
    public DateTimeImmutable $updatedAt;

    /**
     * Create from ShipPost and ShipSystems.
     */
    public static function fromParts(ShipPost $post, ShipSystems $systems): self
    {
        $model = new self();

        // From CPT
        $model->postId = $post->postId();
        $model->name = $post->name();
        $model->ownerId = $post->ownerId();

        // From systems table
        $model->coreType = $systems->coreType;
        $model->driveType = $systems->driveType;
        $model->sensorType = $systems->sensorType;
        $model->shieldType = $systems->shieldType;
        $model->navTier = $systems->navTier;
        $model->powerFullAt = $systems->powerFullAt;
        $model->powerMax = $systems->powerMax;
        $model->shieldsFullAt = $systems->shieldsFullAt;
        $model->shieldsMax = $systems->shieldsMax;
        $model->coreLife = $systems->coreLife;
        $model->hullIntegrity = $systems->hullIntegrity;
        $model->hullMax = $systems->hullMax;
        $model->nodeId = $systems->nodeId;
        $model->cargo = $systems->cargo;
        $model->currentActionId = $systems->currentActionId;
        $model->createdAt = $systems->createdAt;
        $model->updatedAt = $systems->updatedAt;

        return $model;
    }

    /**
     * Convert back to ShipSystems for saving.
     */
    public function toSystems(): ShipSystems
    {
        return new ShipSystems(
            shipPostId: $this->postId,
            coreType: $this->coreType,
            driveType: $this->driveType,
            sensorType: $this->sensorType,
            shieldType: $this->shieldType,
            navTier: $this->navTier,
            powerFullAt: $this->powerFullAt,
            powerMax: $this->powerMax,
            shieldsFullAt: $this->shieldsFullAt,
            shieldsMax: $this->shieldsMax,
            coreLife: $this->coreLife,
            hullIntegrity: $this->hullIntegrity,
            hullMax: $this->hullMax,
            nodeId: $this->nodeId,
            cargo: $this->cargo,
            currentActionId: $this->currentActionId,
            createdAt: $this->createdAt,
            updatedAt: new DateTimeImmutable(),
        );
    }

    /**
     * Calculate current power level based on regen.
     *
     * Uses "full_at" timestamp pattern: if powerFullAt is in the past,
     * power is at max. If in the future, calculate how much has regenerated.
     */
    public function currentPower(?DateTimeImmutable $now = null): float
    {
        $now ??= new DateTimeImmutable();

        if ($this->powerFullAt === null) {
            return $this->powerMax;
        }

        if ($now >= $this->powerFullAt) {
            return $this->powerMax;
        }

        // Power regenerates at core's regen rate per hour
        $regenRate = $this->coreType->regenRate();
        $secondsUntilFull = $this->powerFullAt->getTimestamp() - $now->getTimestamp();
        $hoursUntilFull = $secondsUntilFull / 3600.0;
        $powerNeeded = $hoursUntilFull * $regenRate;

        return max(0.0, $this->powerMax - $powerNeeded);
    }

    /**
     * Calculate current shield level based on regen.
     */
    public function currentShields(?DateTimeImmutable $now = null): float
    {
        $now ??= new DateTimeImmutable();

        if ($this->shieldsFullAt === null) {
            return $this->shieldsMax;
        }

        if ($now >= $this->shieldsFullAt) {
            return $this->shieldsMax;
        }

        $regenRate = $this->shieldType->regenRate();
        $secondsUntilFull = $this->shieldsFullAt->getTimestamp() - $now->getTimestamp();
        $hoursUntilFull = $secondsUntilFull / 3600.0;
        $shieldsNeeded = $hoursUntilFull * $regenRate;

        return max(0.0, $this->shieldsMax - $shieldsNeeded);
    }

    /**
     * Consume power, adjusting the powerFullAt timestamp.
     */
    public function consumePower(float $amount, ?DateTimeImmutable $now = null): void
    {
        $now ??= new DateTimeImmutable();

        $current = $this->currentPower($now);
        $newLevel = max(0.0, $current - $amount);
        $deficit = $this->powerMax - $newLevel;

        if ($deficit <= 0) {
            $this->powerFullAt = $now;
            return;
        }

        // Calculate when power will be full again
        $regenRate = $this->coreType->regenRate();
        $hoursToFull = $deficit / $regenRate;
        $secondsToFull = (int) ceil($hoursToFull * 3600);

        $this->powerFullAt = $now->modify("+{$secondsToFull} seconds");
    }

    /**
     * Damage shields, adjusting the shieldsFullAt timestamp.
     */
    public function damageShields(float $amount, ?DateTimeImmutable $now = null): void
    {
        $now ??= new DateTimeImmutable();

        $current = $this->currentShields($now);
        $newLevel = max(0.0, $current - $amount);
        $deficit = $this->shieldsMax - $newLevel;

        if ($deficit <= 0) {
            $this->shieldsFullAt = $now;
            return;
        }

        $regenRate = $this->shieldType->regenRate();
        $hoursToFull = $deficit / $regenRate;
        $secondsToFull = (int) ceil($hoursToFull * 3600);

        $this->shieldsFullAt = $now->modify("+{$secondsToFull} seconds");
    }

    /**
     * Damage hull (does not regenerate).
     */
    public function damageHull(float $amount): void
    {
        $this->hullIntegrity = max(0.0, $this->hullIntegrity - $amount);
    }

    /**
     * Repair hull.
     */
    public function repairHull(float $amount): void
    {
        $this->hullIntegrity = min($this->hullMax, $this->hullIntegrity + $amount);
    }

    /**
     * Consume core life (for jumps).
     */
    public function consumeCoreLife(float $distance): void
    {
        $cost = $distance * $this->coreType->jumpCostMultiplier();
        $this->coreLife = max(0.0, $this->coreLife - $cost);
    }

    /**
     * Check if ship is destroyed.
     */
    public function isDestroyed(): bool
    {
        return $this->hullIntegrity <= 0.0;
    }

    /**
     * Check if core is depleted.
     */
    public function isCoreDepeleted(): bool
    {
        return $this->coreLife <= 0.0;
    }

    /**
     * Get cargo quantity for a resource.
     */
    public function cargoQuantity(string $resource): int
    {
        return $this->cargo[$resource] ?? 0;
    }

    /**
     * Add cargo.
     */
    public function addCargo(string $resource, int $quantity): void
    {
        $current = $this->cargo[$resource] ?? 0;
        $this->cargo[$resource] = $current + $quantity;
    }

    /**
     * Remove cargo.
     *
     * @return int Actual amount removed
     */
    public function removeCargo(string $resource, int $quantity): int
    {
        $current = $this->cargo[$resource] ?? 0;
        $removed = min($current, $quantity);

        if ($removed >= $current) {
            unset($this->cargo[$resource]);
        } else {
            $this->cargo[$resource] = $current - $removed;
        }

        return $removed;
    }

    /**
     * Get total cargo weight.
     */
    public function totalCargo(): int
    {
        return array_sum($this->cargo);
    }
}
