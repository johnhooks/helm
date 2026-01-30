# Error Codes

Helm uses centralized error codes defined in `Helm\Core\ErrorCode`.

## Format

All error codes use dot notation with the `helm.` prefix:

```
helm.{domain}.{error_name}
```

- Prefix: `helm.`
- Domain: lowercase (e.g., `navigation`, `ship`, `star`)
- Error name: `snake_case` (e.g., `not_found`, `invalid_node`)

## Usage

```php
use Helm\Core\ErrorCode;

// Create a WP_Error (messages must be translatable)
return ErrorCode::NavigationNoRoute->error(__('No known route to target', 'helm'));

// With additional data
return ErrorCode::NavigationInsufficientFuel->error(__('Insufficient fuel', 'helm'), [
    'required' => $fuelCost,
    'available' => $ship->fuel,
]);

// Check error type
if (ErrorCode::NavigationNoRoute->matches($error)) {
    // Handle no route case
}

// Get the code string
$code = ErrorCode::NavigationNoRoute->code(); // 'helm.navigation.no_route'
```

**Important:** All error messages are user-presentable and must use `__('message', 'helm')` for translation.

## Error Codes

### Navigation (`helm.navigation.*`)

| Code | Enum Case | Description |
|------|-----------|-------------|
| `helm.navigation.invalid_node` | `NavigationInvalidNode` | Ship is not at a valid navigation node |
| `helm.navigation.invalid_target` | `NavigationInvalidTarget` | Target node does not exist |
| `helm.navigation.no_route` | `NavigationNoRoute` | No known edge connects current position to target |
| `helm.navigation.beyond_range` | `NavigationBeyondRange` | Target is beyond ship's drive range |
| `helm.navigation.insufficient_fuel` | `NavigationInsufficientFuel` | Ship lacks fuel for the jump |
| `helm.navigation.scan_failed` | `NavigationScanFailed` | Navigation scan failed to discover route |

### Ship (`helm.ship.*`)

| Code | Enum Case | Description |
|------|-----------|-------------|
| `helm.ship.not_found` | `ShipNotFound` | Ship with given ID does not exist |
| `helm.ship.invalid_state` | `ShipInvalidState` | Ship is in an invalid state for the operation |

### Star (`helm.star.*`)

| Code | Enum Case | Description |
|------|-----------|-------------|
| `helm.star.not_found` | `StarNotFound` | Star with given ID does not exist |

### Origin (`helm.origin.*`)

| Code | Enum Case | Description |
|------|-----------|-------------|
| `helm.origin.not_initialized` | `OriginNotInitialized` | Origin has not been initialized |
| `helm.origin.already_initialized` | `OriginAlreadyInitialized` | Origin is already initialized |

## Adding New Codes

1. Add the enum case to `src/Helm/Core/ErrorCode.php`
2. Use format: `DomainErrorName = 'domain.error_name'`
3. Document in this file
