#!/usr/bin/env php
<?php
/**
 * Generate star catalog from HYG and NASA Exoplanet data.
 *
 * Expects source files in ./tmp/:
 *   - hyg_v42.csv (HYG Database)
 *   - exoplanets.csv (NASA Exoplanet Archive)
 *
 * Run download-star-data.sh first to get these files.
 *
 * Usage: php bin/generate-star-catalog.php [--max-distance=100]
 */

declare(strict_types=1);

ini_set('memory_limit', '512M');

// Configuration
$maxDistanceLy = 100;
foreach ($argv as $arg) {
    if (str_starts_with($arg, '--max-distance=')) {
        $maxDistanceLy = (float) substr($arg, 15);
    }
}

$projectDir = dirname(__DIR__);
$tmpDir = $projectDir . '/tmp';
$outputPath = $projectDir . '/data/stars_100ly.json';

$hygPath = $tmpDir . '/hyg_v42.csv';
$exoplanetPath = $tmpDir . '/exoplanets.csv';

if (!file_exists($hygPath)) {
    fwrite(STDERR, "Error: HYG database not found at $hygPath\nRun bin/download-star-data.sh first.\n");
    exit(1);
}

if (!file_exists($exoplanetPath)) {
    fwrite(STDERR, "Error: Exoplanet data not found at $exoplanetPath\nRun bin/download-star-data.sh first.\n");
    exit(1);
}

echo "Building star catalog (max distance: {$maxDistanceLy} ly)...\n\n";

// Load IAU Catalog of Star Names (official proper names)
$iauPath = $tmpDir . '/iau-csn.txt';
$iauNamesByHip = [];  // HIP number -> proper name
$iauNamesByBf = [];   // Bayer-Flamsteed designation -> proper name

if (file_exists($iauPath)) {
    echo "Loading IAU star names...\n";
    $iauLines = file($iauPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($iauLines as $line) {
        if (str_starts_with($line, '#') || str_starts_with($line, '$')) {
            continue;
        }
        // Fixed-width format: Name(0-17), Diacritics(18-35), Designation(36-48),
        // ID(49-54), ID2(55-60), Con(61-64), #(65-68), WDS(69-80),
        // mag(81-86), bnd(87-90), HIP(91-97), HD(98-104), RA(105-115), Dec(116-126)
        $name = trim(substr($line, 0, 18));
        $designation = trim(substr($line, 49, 6));  // Bayer letter (e.g., "alf")
        $constellation = trim(substr($line, 61, 4));  // Constellation abbreviation
        $hipStr = trim(substr($line, 91, 7));

        if (!empty($name) && $name !== '_') {
            // Index by HIP number (most reliable)
            if (!empty($hipStr) && is_numeric($hipStr)) {
                $hip = (int)$hipStr;
                $iauNamesByHip[$hip] = $name;
            }

            // Also index by Bayer + constellation for fallback
            if (!empty($designation) && $designation !== '_' && !empty($constellation)) {
                $bf = $designation . $constellation;
                $iauNamesByBf[$bf] = $name;
            }
        }
    }
    echo "Loaded " . count($iauNamesByHip) . " IAU star names (by HIP)\n";
} else {
    echo "Warning: IAU catalog not found at $iauPath\n";
    echo "Run bin/download-star-data.sh to download it.\n";
}

// Fallback: Load additional name mappings from data file
$starNamesPath = $projectDir . '/data/star-names.json';
$commonNames = [];

if (file_exists($starNamesPath)) {
    $namesData = json_decode(file_get_contents($starNamesPath), true);
    $commonNames = $namesData['mappings'] ?? [];
}

// Load HYG stars - use associative array with unique key
echo "Loading HYG catalog...\n";
$stars = [];  // key => star data
$indexByHip = [];  // hip => key
$indexByHd = [];
$indexByGl = [];
$indexByName = [];
$indexByBf = [];

$handle = fopen($hygPath, 'r');
$headers = fgetcsv($handle);

while (($row = fgetcsv($handle)) !== false) {
    $data = array_combine($headers, $row);

    if (empty($data['dist']) || (float)$data['dist'] <= 0) {
        continue;
    }

    $distLy = (float)$data['dist'] * 3.26156;
    $hygId = $data['id'];

    // Create unique key
    $key = !empty($data['hip']) ? "HIP_{$data['hip']}" :
           (!empty($data['hd']) ? "HD_{$data['hd']}" : "HYG_{$hygId}");

    // Determine proper name using this priority:
    // 1. IAU official name (by HIP number - most reliable)
    // 2. HYG "proper" field
    // 3. IAU official name (by Bayer designation)
    // 4. Fallback mappings from star-names.json
    $properName = null;
    $hip = !empty($data['hip']) ? (int)$data['hip'] : null;

    // Check IAU catalog by HIP first
    if ($hip !== null && isset($iauNamesByHip[$hip])) {
        $properName = $iauNamesByHip[$hip];
    }
    // Fall back to HYG proper name
    elseif (!empty($data['proper'])) {
        $properName = $data['proper'];
    }
    // Try IAU by Bayer designation
    elseif (!empty($data['bayer']) && !empty($data['con'])) {
        $bayerKey = $data['bayer'] . $data['con'];
        if (isset($iauNamesByBf[$bayerKey])) {
            $properName = $iauNamesByBf[$bayerKey];
        }
    }
    // Finally, check our fallback mappings
    if ($properName === null && !empty($data['bf'])) {
        $bf = $data['bf'];
        $properName = $commonNames[$bf] ?? null;
        // Also try without the Flamsteed number
        if ($properName === null && preg_match('/^\d*(.+)$/', $bf, $m)) {
            $properName = $commonNames[$m[1]] ?? null;
        }
    }

    $stars[$key] = [
        'hyg_id' => $hygId,
        'hip' => !empty($data['hip']) ? (int)$data['hip'] : null,
        'hd' => !empty($data['hd']) ? (int)$data['hd'] : null,
        'hr' => !empty($data['hr']) ? (int)$data['hr'] : null,
        'gl' => $data['gl'] ?: null,
        'name' => $properName,
        'bayer_flamsteed' => $data['bf'] ?: null,
        'constellation' => $data['con'] ?: null,
        'ra' => !empty($data['ra']) ? round((float)$data['ra'], 6) : null,
        'dec' => !empty($data['dec']) ? round((float)$data['dec'], 6) : null,
        'distance_ly' => round($distLy, 4),
        'distance_pc' => round((float)$data['dist'], 4),
        'x' => !empty($data['x']) ? round((float)$data['x'], 4) : null,
        'y' => !empty($data['y']) ? round((float)$data['y'], 4) : null,
        'z' => !empty($data['z']) ? round((float)$data['z'], 4) : null,
        'proper_motion_ra' => !empty($data['pmra']) ? round((float)$data['pmra'], 2) : null,
        'proper_motion_dec' => !empty($data['pmdec']) ? round((float)$data['pmdec'], 2) : null,
        'radial_velocity' => !empty($data['rv']) ? round((float)$data['rv'], 1) : null,
        'apparent_mag' => !empty($data['mag']) ? round((float)$data['mag'], 2) : null,
        'absolute_mag' => !empty($data['absmag']) ? round((float)$data['absmag'], 3) : null,
        'luminosity_solar' => (!empty($data['lum']) && (float)$data['lum'] > 0) ? round((float)$data['lum'], 8) : null,
        'spectral_type' => $data['spect'] ?: null,
        'color_index' => !empty($data['ci']) ? round((float)$data['ci'], 3) : null,
        'component_count' => !empty($data['comp']) ? (int)$data['comp'] : 1,
        'is_primary' => empty($data['comp_primary']) || $data['comp_primary'] === $data['id'],
        'system_id' => $data['base'] ?: null,
        'variable_type' => $data['var'] ?: null,
        'variable_min_mag' => !empty($data['var_min']) ? round((float)$data['var_min'], 2) : null,
        'variable_max_mag' => !empty($data['var_max']) ? round((float)$data['var_max'], 2) : null,
        'temperature_k' => null,
        'mass_solar' => null,
        'radius_solar' => null,
        'age_gyr' => null,
        'confirmed_planets' => [],
    ];

    // Build indexes (store key, not reference)
    $star = $stars[$key];

    if ($star['hip']) {
        $indexByHip[(string)$star['hip']] = $key;
    }
    if ($star['hd']) {
        $indexByHd[(string)$star['hd']] = $key;
    }
    if ($star['gl']) {
        $glNorm = strtoupper(str_replace(' ', '', $star['gl']));
        $indexByGl[$glNorm] = $key;
        if (str_starts_with($glNorm, 'GL')) {
            $indexByGl['GJ' . substr($glNorm, 2)] = $key;
        }
    }
    if ($star['name']) {
        $nameLower = strtolower(trim($star['name']));
        $indexByName[$nameLower] = $key;
        $indexByName[str_replace(' centauri', ' cen', $nameLower)] = $key;
        $indexByName[str_replace("'s star", "", $nameLower)] = $key;
        $indexByName[str_replace("'s", "", $nameLower)] = $key;
    }
    if ($star['bayer_flamsteed']) {
        $bf = strtolower(trim($star['bayer_flamsteed']));
        $indexByBf[$bf] = $key;

        if (preg_match('/(\d*)([a-z]+)\s*(\w+)/', $bf, $m)) {
            $greek = $m[2];
            $const = $m[3];
            $indexByBf["$greek $const"] = $key;
            $indexByBf["$greek$const"] = $key;

            $greekMap = [
                'alp' => 'alpha', 'bet' => 'beta', 'gam' => 'gamma', 'del' => 'delta',
                'eps' => 'epsilon', 'zet' => 'zeta', 'eta' => 'eta', 'the' => 'theta',
                'iot' => 'iota', 'kap' => 'kappa', 'lam' => 'lambda', 'mu' => 'mu',
                'nu' => 'nu', 'xi' => 'xi', 'omi' => 'omicron', 'pi' => 'pi',
                'rho' => 'rho', 'sig' => 'sigma', 'tau' => 'tau', 'ups' => 'upsilon',
                'phi' => 'phi', 'chi' => 'chi', 'psi' => 'psi', 'ome' => 'omega',
            ];
            if (isset($greekMap[$greek])) {
                $full = $greekMap[$greek];
                $indexByBf["$full $const"] = $key;
                $indexByBf["$full$const"] = $key;
            }
        }
    }
}
fclose($handle);

echo "Loaded " . count($stars) . " stars\n";

// Load exoplanets
echo "\nLoading exoplanet data...\n";
$hosts = [];
$handle = fopen($exoplanetPath, 'r');
$headers = fgetcsv($handle);

while (($row = fgetcsv($handle)) !== false) {
    $data = array_combine($headers, $row);
    $hostname = $data['hostname'];
    if (!isset($hosts[$hostname])) {
        $hosts[$hostname] = [];
    }
    $hosts[$hostname][] = $data;
}
fclose($handle);

echo "Loaded " . array_sum(array_map('count', $hosts)) . " planets from " . count($hosts) . " hosts\n";

// Matching function - returns star key or null
function tryMatch(string $hostname, array $indexes): ?string {
    $hostLower = strtolower(trim($hostname));

    if (isset($indexes['name'][$hostLower])) return $indexes['name'][$hostLower];
    if (isset($indexes['bf'][$hostLower])) return $indexes['bf'][$hostLower];

    $base = preg_replace('/\s*[AB]$/', '', $hostLower);
    if (isset($indexes['name'][$base])) return $indexes['name'][$base];
    if (isset($indexes['bf'][$base])) return $indexes['bf'][$base];

    if (preg_match('/^HD\s*(\d+)/i', $hostname, $m) && isset($indexes['hd'][$m[1]])) {
        return $indexes['hd'][$m[1]];
    }
    if (preg_match('/^HIP\s*(\d+)/i', $hostname, $m) && isset($indexes['hip'][$m[1]])) {
        return $indexes['hip'][$m[1]];
    }
    if (preg_match('/^(?:Gl|GJ|Gliese)\s*(\d+\.?\d*)([A-Z])?/i', $hostname, $m)) {
        $num = str_replace('.', '', $m[1]);
        $suffix = strtoupper($m[2] ?? '');
        foreach (['GL', 'GJ'] as $prefix) {
            foreach ([$prefix . $num . $suffix, $prefix . $num] as $glId) {
                if (isset($indexes['gl'][$glId])) return $indexes['gl'][$glId];
            }
        }
    }
    if (preg_match('/^(\d+)\s+(\w+)$/', $hostLower, $m)) {
        foreach ($indexes['bf'] as $bf => $key) {
            if (str_contains($bf, $m[1]) && str_contains($bf, $m[2])) {
                return $key;
            }
        }
    }
    return null;
}

echo "\nMatching exoplanets to stars...\n";
$indexes = [
    'hip' => $indexByHip,
    'hd' => $indexByHd,
    'gl' => $indexByGl,
    'name' => $indexByName,
    'bf' => $indexByBf,
];

$matchedCount = 0;
$planetCount = 0;

foreach ($hosts as $hostname => $planets) {
    $key = tryMatch($hostname, $indexes);
    if ($key === null || !isset($stars[$key])) {
        continue;
    }

    $matchedCount++;
    $sample = $planets[0];

    // Supplement star data
    if (!empty($sample['st_teff']) && $stars[$key]['temperature_k'] === null) {
        $stars[$key]['temperature_k'] = (int)round((float)$sample['st_teff']);
    }
    if (!empty($sample['st_mass']) && $stars[$key]['mass_solar'] === null) {
        $stars[$key]['mass_solar'] = round((float)$sample['st_mass'], 4);
    }
    if (!empty($sample['st_rad']) && $stars[$key]['radius_solar'] === null) {
        $stars[$key]['radius_solar'] = round((float)$sample['st_rad'], 4);
    }
    if (!empty($sample['st_age']) && $stars[$key]['age_gyr'] === null) {
        $stars[$key]['age_gyr'] = round((float)$sample['st_age'], 2);
    }

    foreach ($planets as $p) {
        $stars[$key]['confirmed_planets'][] = [
            'name' => $p['pl_name'],
            'orbital_period_days' => !empty($p['pl_orbper']) ? round((float)$p['pl_orbper'], 6) : null,
            'semi_major_axis_au' => !empty($p['pl_orbsmax']) ? round((float)$p['pl_orbsmax'], 6) : null,
            'radius_earth' => !empty($p['pl_rade']) ? round((float)$p['pl_rade'], 4) : null,
            'mass_earth' => !empty($p['pl_bmasse']) ? round((float)$p['pl_bmasse'], 4) : null,
            'equilibrium_temp_k' => !empty($p['pl_eqt']) ? (int)round((float)$p['pl_eqt']) : null,
        ];
        $planetCount++;
    }
}

echo "Matched $matchedCount hosts with $planetCount planets\n";

// Estimate from spectral type
function estimateFromSpectral(array &$star): void {
    $spect = $star['spectral_type'] ?? '';
    if (!preg_match('/^([OBAFGKM])(\d)?/', $spect, $m)) return;

    $cls = $m[1];
    $subtype = isset($m[2]) ? (int)$m[2] : 5;
    $estimates = [
        'O' => ['temp' => [50000, 30000], 'mass' => [90, 16], 'radius' => [20, 6.6]],
        'B' => ['temp' => [30000, 10000], 'mass' => [16, 2.1], 'radius' => [6.6, 1.8]],
        'A' => ['temp' => [10000, 7500], 'mass' => [2.1, 1.4], 'radius' => [1.8, 1.4]],
        'F' => ['temp' => [7500, 6000], 'mass' => [1.4, 1.04], 'radius' => [1.4, 1.15]],
        'G' => ['temp' => [6000, 5200], 'mass' => [1.04, 0.8], 'radius' => [1.15, 0.96]],
        'K' => ['temp' => [5200, 3700], 'mass' => [0.8, 0.45], 'radius' => [0.96, 0.7]],
        'M' => ['temp' => [3700, 2400], 'mass' => [0.45, 0.08], 'radius' => [0.7, 0.1]],
    ];
    if (!isset($estimates[$cls])) return;

    $e = $estimates[$cls];
    $t = $subtype / 9.0;
    if ($star['temperature_k'] === null) $star['temperature_k'] = (int)round($e['temp'][0] - ($e['temp'][0] - $e['temp'][1]) * $t);
    if ($star['mass_solar'] === null) $star['mass_solar'] = round($e['mass'][0] - ($e['mass'][0] - $e['mass'][1]) * $t, 4);
    if ($star['radius_solar'] === null) $star['radius_solar'] = round($e['radius'][0] - ($e['radius'][0] - $e['radius'][1]) * $t, 4);
}

// Filter and sort
echo "\nFiltering to {$maxDistanceLy} light years...\n";
$nearby = array_filter($stars, fn($s) => $s['distance_ly'] <= $maxDistanceLy);
uasort($nearby, fn($a, $b) => $a['distance_ly'] <=> $b['distance_ly']);

foreach ($nearby as $key => &$star) {
    estimateFromSpectral($star);
}
unset($star);

// Clean
function cleanStar(array $star): array {
    $clean = [];
    foreach ($star as $k => $v) {
        if ($k === 'hyg_id') continue;
        if ($v === null) continue;
        if ($k === 'confirmed_planets' && empty($v)) continue;
        $clean[$k] = $v;
    }
    return $clean;
}

// Sol
$sol = [
    'name' => 'Sol', 'spectral_type' => 'G2V', 'distance_ly' => 0, 'distance_pc' => 0,
    'ra' => 0, 'dec' => 0, 'x' => 0, 'y' => 0, 'z' => 0,
    'apparent_mag' => -26.74, 'absolute_mag' => 4.83, 'luminosity_solar' => 1.0,
    'temperature_k' => 5778, 'mass_solar' => 1.0, 'radius_solar' => 1.0, 'age_gyr' => 4.6,
    'confirmed_planets' => [
        ['name' => 'Mercury', 'semi_major_axis_au' => 0.387, 'orbital_period_days' => 88.0, 'mass_earth' => 0.055, 'radius_earth' => 0.383],
        ['name' => 'Venus', 'semi_major_axis_au' => 0.723, 'orbital_period_days' => 224.7, 'mass_earth' => 0.815, 'radius_earth' => 0.949],
        ['name' => 'Earth', 'semi_major_axis_au' => 1.0, 'orbital_period_days' => 365.25, 'mass_earth' => 1.0, 'radius_earth' => 1.0],
        ['name' => 'Mars', 'semi_major_axis_au' => 1.524, 'orbital_period_days' => 687.0, 'mass_earth' => 0.107, 'radius_earth' => 0.532],
        ['name' => 'Jupiter', 'semi_major_axis_au' => 5.203, 'orbital_period_days' => 4332.6, 'mass_earth' => 317.8, 'radius_earth' => 11.21],
        ['name' => 'Saturn', 'semi_major_axis_au' => 9.537, 'orbital_period_days' => 10759.2, 'mass_earth' => 95.2, 'radius_earth' => 9.45],
        ['name' => 'Uranus', 'semi_major_axis_au' => 19.19, 'orbital_period_days' => 30688.5, 'mass_earth' => 14.5, 'radius_earth' => 4.01],
        ['name' => 'Neptune', 'semi_major_axis_au' => 30.07, 'orbital_period_days' => 60182.0, 'mass_earth' => 17.1, 'radius_earth' => 3.88],
    ],
];

$catalog = [
    '_meta' => [
        'description' => "Real star catalog within {$maxDistanceLy} light years of Sol",
        'version' => '1.0.0',
        'generated' => date('Y-m-d'),
        'sources' => [
            'stars' => ['name' => 'HYG Database v4.2', 'author' => 'David Nash', 'license' => 'CC BY-SA 4.0', 'url' => 'https://www.astronexus.com/hyg'],
            'exoplanets' => ['name' => 'NASA Exoplanet Archive', 'license' => 'Public Domain', 'url' => 'https://exoplanetarchive.ipac.caltech.edu'],
        ],
    ],
    'stars' => ['SOL' => $sol],
];

foreach ($nearby as $key => $star) {
    $catalog['stars'][$key] = cleanStar($star);
}

$catalog['_meta']['stats'] = [
    'total_stars' => count($catalog['stars']),
    'stars_with_planets' => count(array_filter($catalog['stars'], fn($s) => !empty($s['confirmed_planets']))),
    'total_planets' => array_sum(array_map(fn($s) => count($s['confirmed_planets'] ?? []), $catalog['stars'])),
    'multi_star_systems' => count(array_filter($catalog['stars'], fn($s) => ($s['component_count'] ?? 1) > 1)),
    'variable_stars' => count(array_filter($catalog['stars'], fn($s) => !empty($s['variable_type']))),
    'max_distance_ly' => $maxDistanceLy,
];

file_put_contents($outputPath, json_encode($catalog, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
echo "\nOutput: $outputPath (" . round(filesize($outputPath) / 1024, 1) . " KB)\n";
echo "\n=== STATS ===\n";
foreach ($catalog['_meta']['stats'] as $k => $v) echo "  $k: $v\n";
echo "\nDone!\n";
