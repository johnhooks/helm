<?php

declare(strict_types=1);

namespace Tests\Wpunit\Stars;

use Helm\Stars\Star;
use lucatume\WPBrowser\TestCase\WPTestCase;

/**
 * @covers \Helm\Stars\Star
 */
class StarTest extends WPTestCase
{
    public function test_cartesian3d_returns_origin_for_sol(): void
    {
        $sol = new Star(
            id: 'SOL',
            name: 'Sol',
            spectralType: 'G2V',
            distanceLy: 0.0,
            ra: 0.0,
            dec: 0.0,
        );

        [$x, $y, $z] = $sol->cartesian3D();

        $this->assertSame(0.0, $x);
        $this->assertSame(0.0, $y);
        $this->assertSame(0.0, $z);
    }

    public function test_cartesian3d_calculates_from_ra_dec_distance(): void
    {
        // Star at RA=0°, Dec=0°, Distance=10 ly
        // Should be on positive X-axis
        $star = new Star(
            id: 'TEST1',
            name: null,
            spectralType: 'G2V',
            distanceLy: 10.0,
            ra: 0.0,
            dec: 0.0,
        );

        [$x, $y, $z] = $star->cartesian3D();

        $this->assertEqualsWithDelta(10.0, $x, 0.0001);
        $this->assertEqualsWithDelta(0.0, $y, 0.0001);
        $this->assertEqualsWithDelta(0.0, $z, 0.0001);
    }

    public function test_cartesian3d_positive_y_at_ra_90(): void
    {
        // Star at RA=90°, Dec=0°, Distance=10 ly
        // Should be on positive Y-axis
        $star = new Star(
            id: 'TEST2',
            name: null,
            spectralType: 'G2V',
            distanceLy: 10.0,
            ra: 90.0,
            dec: 0.0,
        );

        [$x, $y, $z] = $star->cartesian3D();

        $this->assertEqualsWithDelta(0.0, $x, 0.0001);
        $this->assertEqualsWithDelta(10.0, $y, 0.0001);
        $this->assertEqualsWithDelta(0.0, $z, 0.0001);
    }

    public function test_cartesian3d_positive_z_at_dec_90(): void
    {
        // Star at RA=0°, Dec=90°, Distance=10 ly
        // Should be on positive Z-axis (north celestial pole)
        $star = new Star(
            id: 'TEST3',
            name: null,
            spectralType: 'G2V',
            distanceLy: 10.0,
            ra: 0.0,
            dec: 90.0,
        );

        [$x, $y, $z] = $star->cartesian3D();

        $this->assertEqualsWithDelta(0.0, $x, 0.0001);
        $this->assertEqualsWithDelta(0.0, $y, 0.0001);
        $this->assertEqualsWithDelta(10.0, $z, 0.0001);
    }

    public function test_cartesian3d_negative_z_at_dec_minus_90(): void
    {
        // Star at RA=0°, Dec=-90°, Distance=10 ly
        // Should be on negative Z-axis (south celestial pole)
        $star = new Star(
            id: 'TEST4',
            name: null,
            spectralType: 'G2V',
            distanceLy: 10.0,
            ra: 0.0,
            dec: -90.0,
        );

        [$x, $y, $z] = $star->cartesian3D();

        $this->assertEqualsWithDelta(0.0, $x, 0.0001);
        $this->assertEqualsWithDelta(0.0, $y, 0.0001);
        $this->assertEqualsWithDelta(-10.0, $z, 0.0001);
    }

    public function test_cartesian3d_uses_position3d_if_available(): void
    {
        // Star with pre-calculated coordinates in properties
        $star = new Star(
            id: 'TEST5',
            name: null,
            spectralType: 'G2V',
            distanceLy: 10.0,
            ra: 45.0,
            dec: 45.0,
            properties: [
                'x' => 1.5,
                'y' => 2.5,
                'z' => 3.5,
            ],
        );

        [$x, $y, $z] = $star->cartesian3D();

        // Should use the pre-calculated values
        $this->assertSame(1.5, $x);
        $this->assertSame(2.5, $y);
        $this->assertSame(3.5, $z);
    }

    public function test_cartesian3d_arbitrary_position(): void
    {
        // Star at RA=45°, Dec=30°, Distance=10 ly
        // Expected values calculated from spherical to cartesian conversion
        $star = new Star(
            id: 'TEST6',
            name: null,
            spectralType: 'G2V',
            distanceLy: 10.0,
            ra: 45.0,
            dec: 30.0,
        );

        [$x, $y, $z] = $star->cartesian3D();

        // cos(30°) = ~0.866, sin(30°) = 0.5
        // cos(45°) = sin(45°) = ~0.707
        // x = 10 * cos(30°) * cos(45°) = 10 * 0.866 * 0.707 ≈ 6.12
        // y = 10 * cos(30°) * sin(45°) = 10 * 0.866 * 0.707 ≈ 6.12
        // z = 10 * sin(30°) = 10 * 0.5 = 5.0
        $this->assertEqualsWithDelta(6.124, $x, 0.01);
        $this->assertEqualsWithDelta(6.124, $y, 0.01);
        $this->assertEqualsWithDelta(5.0, $z, 0.01);
    }

    public function test_spectral_class_extracts_first_letter(): void
    {
        $star = new Star(
            id: 'TEST',
            name: null,
            spectralType: 'G2V',
            distanceLy: 0.0,
            ra: 0.0,
            dec: 0.0,
        );

        $this->assertSame('G', $star->spectralClass());
    }

    public function test_spectral_subtype_extracts_number(): void
    {
        $star = new Star(
            id: 'TEST',
            name: null,
            spectralType: 'G2V',
            distanceLy: 0.0,
            ra: 0.0,
            dec: 0.0,
        );

        $this->assertSame(2, $star->spectralSubtype());
    }

    public function test_display_name_returns_name_if_set(): void
    {
        $star = new Star(
            id: 'HIP_70890',
            name: 'Proxima Centauri',
            spectralType: 'M5Ve',
            distanceLy: 4.24,
            ra: 217.4,
            dec: -62.7,
        );

        $this->assertSame('Proxima Centauri', $star->displayName());
    }

    public function test_display_name_returns_id_if_no_name(): void
    {
        $star = new Star(
            id: 'HIP_12345',
            name: null,
            spectralType: 'K2V',
            distanceLy: 15.0,
            ra: 100.0,
            dec: 20.0,
        );

        $this->assertSame('HIP_12345', $star->displayName());
    }

    public function test_is_sol_returns_true_for_sol(): void
    {
        $sol = new Star(
            id: 'SOL',
            name: 'Sol',
            spectralType: 'G2V',
            distanceLy: 0.0,
            ra: 0.0,
            dec: 0.0,
        );

        $this->assertTrue($sol->isSol());
    }

    public function test_is_sol_returns_false_for_other_stars(): void
    {
        $star = new Star(
            id: 'PROXIMA',
            name: 'Proxima Centauri',
            spectralType: 'M5Ve',
            distanceLy: 4.24,
            ra: 0.0,
            dec: 0.0,
        );

        $this->assertFalse($star->isSol());
    }
}
