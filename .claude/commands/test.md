# Running Tests

Helm uses Codeception with slic (Docker-based WordPress testing environment).

## Running Tests

Tests must be run from the parent directory (`~/Projects`) using slic:

```bash
# Point slic at the plugins directory (if not already done)
slic here

# Select this plugin
slic use helm

# Run all tests
slic run Wpunit

# Run tests in a directory
slic run Wpunit "ShipLink/"

# Run a specific test file
slic run Wpunit "ShipLink/HexCoordinateTest.php"

# Run a specific test method
slic run Wpunit "ShipLink/HexCoordinateTest.php:testDistanceCalculation"
```

## Debugging Tests

To debug tests, use `codecept_debug()` in your test code and run with the `--debug` flag:

```php
// In your test file
codecept_debug($variable);
codecept_debug($coordinate->toArray());
```

```bash
# Run with debug output
slic run Wpunit:TestName -- --debug
```

## Interactive Debugging

For more complex debugging, drop into the slic shell:

```bash
slic shell
cd /var/www/html/wp-content/plugins/helm
vendor/bin/codecept run Wpunit --debug
```

## Test Organization

Tests are organized by domain:

```
tests/Wpunit/
├── ShipLink/           # ShipLink contract and simulation tests
│   ├── HexCoordinateTest.php
│   └── PositionTest.php
├── Systems/            # Ship systems tests
│   ├── ShieldsTest.php
│   └── PowerTest.php
└── Rest/               # REST API endpoint tests
```

## Writing Tests

Extend `WPTestCase` for WordPress integration tests:

```php
<?php

namespace Tests\Wpunit\ShipLink;

use lucatume\WPBrowser\TestCase\WPTestCase;
use Helm\ShipLink\Contracts\HexCoordinate;

class HexCoordinateTest extends WPTestCase
{
    public function testDistanceCalculation(): void
    {
        $a = new HexCoordinate(0, 0, 0);
        $b = new HexCoordinate(3, -2, -1);

        $this->assertEquals(3, $a->distanceTo($b));
    }
}
```

## Coverage

Run tests with coverage:

```bash
XDEBUG_MODE=coverage slic run Wpunit -- --coverage-html coverage/html
```
