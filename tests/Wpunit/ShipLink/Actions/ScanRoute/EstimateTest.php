<?php

declare(strict_types=1);

namespace Tests\Wpunit\ShipLink\Actions\ScanRoute;

use Helm\ShipLink\Actions\ScanRoute\Rules;
use lucatume\WPBrowser\TestCase\WPTestCase;

class EstimateTest extends WPTestCase
{
    public function test_estimates_match_shared_frontend_fixtures(): void
    {
        $cases = json_decode(file_get_contents(dirname(__DIR__, 4) . '/Fixtures/scan-estimates.json'), true, 512, JSON_THROW_ON_ERROR);
        foreach ($cases as $case) {
            $actual = Rules::estimate($case['input']);
            foreach ($case['expected'] as $key => $value) {
                $this->assertEqualsWithDelta($value, $actual[$key], 0.0000001, $case['name'] . ': ' . $key);
            }
        }
    }
}
