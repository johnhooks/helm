<?php

declare(strict_types=1);

// Wpunit suite bootstrap file.

use Helm\Database\Schema;

// Ensure tables exist before any tests run.
// WPLoader loads the plugin but doesn't trigger activation hooks.
Schema::createTables();
