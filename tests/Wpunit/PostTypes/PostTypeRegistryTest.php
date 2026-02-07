<?php

declare(strict_types=1);

namespace Tests\Wpunit\PostTypes;

use Helm\PostTypes\PostTypeRegistry;
use lucatume\WPBrowser\TestCase\WPTestCase;

/**
 * @covers \Helm\PostTypes\PostTypeRegistry
 */
class PostTypeRegistryTest extends WPTestCase
{
    public function test_star_post_type_is_registered(): void
    {
        $this->assertTrue(post_type_exists(PostTypeRegistry::POST_TYPE_STAR));
    }

    public function test_planet_post_type_is_registered(): void
    {
        $this->assertTrue(post_type_exists(PostTypeRegistry::POST_TYPE_PLANET));
    }

    public function test_ship_post_type_is_registered(): void
    {
        $this->assertTrue(post_type_exists(PostTypeRegistry::POST_TYPE_SHIP));
    }

    public function test_constellation_taxonomy_is_registered(): void
    {
        $this->assertTrue(taxonomy_exists(PostTypeRegistry::TAXONOMY_CONSTELLATION));
    }

    public function test_spectral_class_taxonomy_is_registered(): void
    {
        $this->assertTrue(taxonomy_exists(PostTypeRegistry::TAXONOMY_SPECTRAL_CLASS));
    }

    public function test_planet_type_taxonomy_is_registered(): void
    {
        $this->assertTrue(taxonomy_exists(PostTypeRegistry::TAXONOMY_PLANET_TYPE));
    }

    public function test_star_post_type_is_not_public(): void
    {
        $postType = get_post_type_object(PostTypeRegistry::POST_TYPE_STAR);

        $this->assertFalse($postType->public);
    }

    public function test_star_post_type_has_rest_support(): void
    {
        $postType = get_post_type_object(PostTypeRegistry::POST_TYPE_STAR);

        $this->assertTrue($postType->show_in_rest);
        $this->assertSame('stars', $postType->rest_base);
    }

    public function test_planet_post_type_is_hierarchical(): void
    {
        $postType = get_post_type_object(PostTypeRegistry::POST_TYPE_PLANET);

        $this->assertTrue($postType->hierarchical);
    }

    public function test_constellation_taxonomy_is_attached_to_stars(): void
    {
        $taxonomy = get_taxonomy(PostTypeRegistry::TAXONOMY_CONSTELLATION);

        $this->assertContains(PostTypeRegistry::POST_TYPE_STAR, $taxonomy->object_type);
    }

    public function test_spectral_class_taxonomy_is_attached_to_stars(): void
    {
        $taxonomy = get_taxonomy(PostTypeRegistry::TAXONOMY_SPECTRAL_CLASS);

        $this->assertContains(PostTypeRegistry::POST_TYPE_STAR, $taxonomy->object_type);
    }

    public function test_planet_type_taxonomy_is_attached_to_planets(): void
    {
        $taxonomy = get_taxonomy(PostTypeRegistry::TAXONOMY_PLANET_TYPE);

        $this->assertContains(PostTypeRegistry::POST_TYPE_PLANET, $taxonomy->object_type);
    }

    public function test_get_post_types_returns_all_types(): void
    {
        $types = PostTypeRegistry::getPostTypes();

        $this->assertContains(PostTypeRegistry::POST_TYPE_STAR, $types);
        $this->assertContains(PostTypeRegistry::POST_TYPE_PLANET, $types);
        $this->assertContains(PostTypeRegistry::POST_TYPE_SHIP, $types);
        $this->assertContains(PostTypeRegistry::POST_TYPE_STATION, $types);
        $this->assertContains(PostTypeRegistry::POST_TYPE_ANOMALY, $types);
        $this->assertCount(5, $types);
    }

    public function test_get_taxonomies_returns_all_taxonomies(): void
    {
        $taxonomies = PostTypeRegistry::getTaxonomies();

        $this->assertContains(PostTypeRegistry::TAXONOMY_CONSTELLATION, $taxonomies);
        $this->assertContains(PostTypeRegistry::TAXONOMY_SPECTRAL_CLASS, $taxonomies);
        $this->assertContains(PostTypeRegistry::TAXONOMY_PLANET_TYPE, $taxonomies);
        $this->assertContains(PostTypeRegistry::TAXONOMY_STATION_TYPE, $taxonomies);
        $this->assertContains(PostTypeRegistry::TAXONOMY_ANOMALY_TYPE, $taxonomies);
        $this->assertCount(5, $taxonomies);
    }

    public function test_meta_key_constants_are_prefixed(): void
    {
        // All meta keys should start with _helm_
        $this->assertStringStartsWith('_helm_', PostTypeRegistry::META_STAR_CATALOG_ID);
        $this->assertStringStartsWith('_helm_', PostTypeRegistry::META_STAR_DISTANCE_LY);
        $this->assertStringStartsWith('_helm_', PostTypeRegistry::META_PLANET_ID);
        $this->assertStringStartsWith('_helm_', PostTypeRegistry::META_SHIP_ID);
    }
}
