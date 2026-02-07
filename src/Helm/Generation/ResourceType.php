<?php

declare(strict_types=1);

namespace Helm\Generation;

/**
 * All mineable/collectible resource types.
 *
 * Properties based on docs/economy-resources.md:
 * - category: ore, gas, ice, organic, special
 * - volume: m³ per unit (affects cargo)
 * - rarity: common, uncommon, rare, very_rare
 * - base_value: credits per unit
 */
enum ResourceType: string
{
    // Ores (mined from asteroids, rocky planets)
    case IronOre = 'iron_ore';
    case NickelOre = 'nickel_ore';
    case CopperOre = 'copper_ore';
    case TitaniumOre = 'titanium_ore';
    case PlatinumOre = 'platinum_ore';
    case GoldOre = 'gold_ore';
    case RareEarthOre = 'rare_earth_ore';
    case UraniumOre = 'uranium_ore';
    case ExoticOre = 'exotic_ore';

    // Gases (collected from gas giants, nebulae)
    case Hydrogen = 'hydrogen';
    case Helium = 'helium';
    case Nitrogen = 'nitrogen';
    case Deuterium = 'deuterium';
    case Helium3 = 'helium_3';
    case ExoticGas = 'exotic_gas';

    // Ices (harvested from ice bodies, comets)
    case WaterIce = 'water_ice';
    case AmmoniaIce = 'ammonia_ice';
    case MethaneIce = 'methane_ice';
    case NitrogenIce = 'nitrogen_ice';

    // Organics (found on habitable worlds)
    case Biomass = 'biomass';
    case Proteins = 'proteins';
    case RareCompounds = 'rare_compounds';
    case AlienTissue = 'alien_tissue';

    // Special
    case Crystals = 'crystals';

    public function label(): string
    {
        return match ($this) {
            self::IronOre => __('Iron Ore', 'helm'),
            self::NickelOre => __('Nickel Ore', 'helm'),
            self::CopperOre => __('Copper Ore', 'helm'),
            self::TitaniumOre => __('Titanium Ore', 'helm'),
            self::PlatinumOre => __('Platinum Ore', 'helm'),
            self::GoldOre => __('Gold Ore', 'helm'),
            self::RareEarthOre => __('Rare Earth Ore', 'helm'),
            self::UraniumOre => __('Uranium Ore', 'helm'),
            self::ExoticOre => __('Exotic Ore', 'helm'),
            self::Hydrogen => __('Hydrogen', 'helm'),
            self::Helium => __('Helium', 'helm'),
            self::Nitrogen => __('Nitrogen', 'helm'),
            self::Deuterium => __('Deuterium', 'helm'),
            self::Helium3 => __('Helium-3', 'helm'),
            self::ExoticGas => __('Exotic Gas', 'helm'),
            self::WaterIce => __('Water Ice', 'helm'),
            self::AmmoniaIce => __('Ammonia Ice', 'helm'),
            self::MethaneIce => __('Methane Ice', 'helm'),
            self::NitrogenIce => __('Nitrogen Ice', 'helm'),
            self::Biomass => __('Biomass', 'helm'),
            self::Proteins => __('Proteins', 'helm'),
            self::RareCompounds => __('Rare Compounds', 'helm'),
            self::AlienTissue => __('Alien Tissue', 'helm'),
            self::Crystals => __('Crystals', 'helm'),
        };
    }

    /**
     * Get the resource category.
     */
    public function category(): ResourceCategory
    {
        return match ($this) {
            self::IronOre,
            self::NickelOre,
            self::CopperOre,
            self::TitaniumOre,
            self::PlatinumOre,
            self::GoldOre,
            self::RareEarthOre,
            self::UraniumOre,
            self::ExoticOre => ResourceCategory::Ore,

            self::Hydrogen,
            self::Helium,
            self::Nitrogen,
            self::Deuterium,
            self::Helium3,
            self::ExoticGas => ResourceCategory::Gas,

            self::WaterIce,
            self::AmmoniaIce,
            self::MethaneIce,
            self::NitrogenIce => ResourceCategory::Ice,

            self::Biomass,
            self::Proteins,
            self::RareCompounds,
            self::AlienTissue => ResourceCategory::Organic,

            self::Crystals => ResourceCategory::Special,
        };
    }

    /**
     * Get volume in m³ per unit.
     */
    public function volume(): float
    {
        return match ($this->category()) {
            ResourceCategory::Ore => 0.1,
            ResourceCategory::Gas => 0.05,
            ResourceCategory::Ice => 0.15,
            ResourceCategory::Organic => 0.2,
            ResourceCategory::Special => 0.1,
        };
    }

    /**
     * Get rarity level.
     */
    public function rarity(): ResourceRarity
    {
        return match ($this) {
            // Common
            self::IronOre,
            self::NickelOre,
            self::Hydrogen,
            self::Helium,
            self::WaterIce,
            self::Biomass => ResourceRarity::Common,

            // Uncommon
            self::CopperOre,
            self::TitaniumOre,
            self::Nitrogen,
            self::AmmoniaIce,
            self::MethaneIce,
            self::Proteins,
            self::Crystals => ResourceRarity::Uncommon,

            // Rare
            self::PlatinumOre,
            self::GoldOre,
            self::RareEarthOre,
            self::UraniumOre,
            self::Deuterium,
            self::NitrogenIce,
            self::RareCompounds => ResourceRarity::Rare,

            // Very Rare
            self::ExoticOre,
            self::Helium3,
            self::ExoticGas,
            self::AlienTissue => ResourceRarity::VeryRare,
        };
    }

    /**
     * Get base value in credits per unit.
     */
    public function baseValue(): int
    {
        return match ($this->rarity()) {
            ResourceRarity::Common => 5,
            ResourceRarity::Uncommon => 15,
            ResourceRarity::Rare => 50,
            ResourceRarity::VeryRare => 200,
        };
    }

    /**
     * Get mining yield per hour (base, before modifiers).
     */
    public function yieldPerHour(): int
    {
        return match ($this->rarity()) {
            ResourceRarity::Common => 10,
            ResourceRarity::Uncommon => 6,
            ResourceRarity::Rare => 3,
            ResourceRarity::VeryRare => 1,
        };
    }

    /**
     * Get all resources in a category.
     *
     * @return array<self>
     */
    public static function inCategory(ResourceCategory $category): array
    {
        return array_filter(
            self::cases(),
            fn(self $r) => $r->category() === $category
        );
    }

    /**
     * Get all resources of a rarity.
     *
     * @return array<self>
     */
    public static function ofRarity(ResourceRarity $rarity): array
    {
        return array_filter(
            self::cases(),
            fn(self $r) => $r->rarity() === $rarity
        );
    }
}
