# WordPress Abilities API for AI Crew

Using WordPress 6.9's Abilities API and MCP Adapter to give AI agents control over ship systems.

## Overview

WordPress 6.9 (December 2025) introduced the Abilities API - a standardized system for exposing WordPress functionality to external tools, including AI agents. Combined with the official MCP Adapter, this creates a direct path for AI crew members to operate ship controls.

```
AI Agent (Claude, ChatGPT, etc.)
        │
        │ Model Context Protocol
        ↓
    MCP Adapter Plugin
        │
        │ Abilities API
        ↓
    Helm Ship Controls
        │
        │ ShipLink
        ↓
    Simulation (wp_options)
```

## The Abilities API

### Core Concepts

The Abilities API provides:

- **Discoverability** - AI agents can list and inspect available abilities
- **Interoperability** - Uniform schema enables workflow composition
- **Security-first** - Explicit permission controls govern invocation
- **Multi-context** - Same ability works via PHP, JavaScript, and REST API

### Registration

Abilities are registered via `wp_register_ability()` during the `wp_abilities_api_init` action:

```php
add_action( 'wp_abilities_api_init', 'helm_register_abilities' );

function helm_register_abilities(): void {
    wp_register_ability( 'helm/shields-status', array(
        'label'       => __( 'Get Shield Status', 'helm' ),
        'description' => __( 'Returns current shield strength and regeneration rate.', 'helm' ),
        'category'    => 'helm-defense',
        'input_schema'  => array(
            'type' => 'null',
        ),
        'output_schema' => array(
            'type'       => 'object',
            'properties' => array(
                'strength'   => array( 'type' => 'integer' ),
                'max'        => array( 'type' => 'integer' ),
                'regen_rate' => array( 'type' => 'number' ),
            ),
        ),
        'execute_callback'    => 'helm_get_shields_status',
        'permission_callback' => fn() => current_user_can( 'helm_view_shields' ),
        'meta' => array( 'show_in_rest' => true ),
    ));
}
```

### Schema Format

Input and output use JSON Schema (version 4 subset):

```php
'input_schema' => array(
    'type'       => 'object',
    'properties' => array(
        'arc' => array(
            'type'        => 'string',
            'enum'        => array( 'fore', 'aft', 'port', 'starboard' ),
            'description' => 'Shield arc to reinforce',
        ),
        'percentage' => array(
            'type'        => 'integer',
            'minimum'     => 0,
            'maximum'     => 100,
            'description' => 'Power allocation percentage',
        ),
    ),
    'required' => array( 'arc', 'percentage' ),
),
```

### REST Endpoints

When `show_in_rest` is true, automatic endpoints are created:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/wp-json/wp-abilities/v1/abilities` | GET | List all abilities |
| `/wp-json/wp-abilities/v1/{namespace/ability}` | GET | Ability details |
| `/wp-json/wp-abilities/v1/{namespace/ability}/run` | POST | Execute ability |

### PHP and JavaScript Access

```php
// PHP
$ability = wp_get_ability( 'helm/shields-status' );
$result = $ability->execute( array() );
```

```javascript
// JavaScript
import { executeAbility } from '@wordpress/abilities';

const status = await executeAbility( 'helm/shields-status', {} );
```

---

## MCP Adapter

The official [MCP Adapter](https://github.com/WordPress/mcp-adapter) bridges WordPress abilities to the Model Context Protocol, enabling AI agents to discover and invoke them.

### What It Does

- Converts WordPress abilities into MCP tools
- Exposes data as MCP resources
- Provides structured MCP prompts
- Handles HTTP and STDIO transport
- Manages authentication

### Installation

```bash
composer require wordpress/mcp-adapter
```

Or install as a plugin from the WordPress repository.

### How AI Agents Connect

1. AI agent (Claude, ChatGPT) connects to your WordPress site via MCP
2. MCP Adapter returns list of available abilities
3. Agent can invoke abilities within its authorized scope
4. Results return through MCP protocol

---

## Helm Implementation

### Ship Control Abilities

Each ship system exposes abilities for AI crew:

```php
// Defense systems
wp_register_ability( 'helm/shields-status', ... );
wp_register_ability( 'helm/shields-reinforce', ... );
wp_register_ability( 'helm/shields-modulate', ... );

// Sensors
wp_register_ability( 'helm/sensors-scan', ... );
wp_register_ability( 'helm/sensors-contacts', ... );
wp_register_ability( 'helm/sensors-analyze', ... );

// Power management
wp_register_ability( 'helm/power-status', ... );
wp_register_ability( 'helm/power-allocate', ... );
wp_register_ability( 'helm/power-emergency', ... );

// Tactical
wp_register_ability( 'helm/tactical-target', ... );
wp_register_ability( 'helm/tactical-fire', ... );
wp_register_ability( 'helm/tactical-cease-fire', ... );

// Navigation
wp_register_ability( 'helm/nav-course', ... );
wp_register_ability( 'helm/nav-position', ... );
wp_register_ability( 'helm/nav-set-course', ... );

// Ship status
wp_register_ability( 'helm/status-overview', ... );
wp_register_ability( 'helm/alerts-list', ... );
wp_register_ability( 'helm/damage-report', ... );
```

### Example: Shield Operations

```php
wp_register_ability( 'helm/shields-reinforce', array(
    'label'       => __( 'Reinforce Shields', 'helm' ),
    'description' => __( 'Redirect power to specified shield arc.', 'helm' ),
    'category'    => 'helm-defense',
    'input_schema'  => array(
        'type'       => 'object',
        'properties' => array(
            'arc' => array(
                'type'        => 'string',
                'enum'        => array( 'fore', 'aft', 'port', 'starboard' ),
                'description' => 'Shield arc to reinforce',
            ),
            'percentage' => array(
                'type'        => 'integer',
                'minimum'     => 0,
                'maximum'     => 100,
                'description' => 'Percentage of available power to allocate',
            ),
        ),
        'required' => array( 'arc', 'percentage' ),
    ),
    'output_schema' => array(
        'type'       => 'object',
        'properties' => array(
            'success'      => array( 'type' => 'boolean' ),
            'arc'          => array( 'type' => 'string' ),
            'new_strength' => array( 'type' => 'integer' ),
            'power_used'   => array( 'type' => 'number' ),
        ),
    ),
    'execute_callback'    => function( $input ) {
        $shields = helm( ShieldsSystem::class );
        return $shields->reinforce( $input['arc'], $input['percentage'] );
    },
    'permission_callback' => fn() => current_user_can( 'helm_operate_shields' ),
    'meta' => array( 'show_in_rest' => true ),
));
```

---

## AI Crew Permissions

### Custom Role

Create a role for AI crew members with specific capabilities:

```php
add_role( 'helm_ai_officer', __( 'AI Officer', 'helm' ), array(
    // View permissions (read-only)
    'helm_view_shields'    => true,
    'helm_view_sensors'    => true,
    'helm_view_power'      => true,
    'helm_view_navigation' => true,
    'helm_view_tactical'   => true,

    // Operate permissions (can act)
    'helm_operate_shields' => true,
    'helm_operate_sensors' => true,
    'helm_operate_power'   => true,

    // Restricted permissions (requires human)
    'helm_operate_navigation' => false,
    'helm_fire_weapons'       => false,
    'helm_self_destruct'      => false,
));
```

### Permission Callbacks

Each ability checks appropriate capability:

```php
'permission_callback' => fn() => current_user_can( 'helm_operate_shields' ),
```

The AI can only do what you authorize. Critical decisions require human override.

### Tiered Authority

| Tier | Capabilities | Example Actions |
|------|--------------|-----------------|
| Observer | View all systems | Read status, monitor alerts |
| Operator | View + operate non-critical | Reinforce shields, run scans, adjust power |
| Officer | View + operate + some critical | Set course, manage crew |
| Command | Full access | Fire weapons, override safety, self-destruct |

AI crew typically runs at Operator tier. Escalates to human for Officer+ decisions.

---

## Standing Orders

Allow humans to configure AI behavior without code changes:

```php
wp_register_ability( 'helm/standing-orders', array(
    'label'       => __( 'Get Standing Orders', 'helm' ),
    'description' => __( 'Retrieves current AI crew directives and thresholds.', 'helm' ),
    'category'    => 'helm-command',
    'input_schema'  => array( 'type' => 'null' ),
    'output_schema' => array(
        'type'       => 'object',
        'properties' => array(
            'shield_alert_threshold' => array( 'type' => 'integer' ),
            'auto_reinforce_shields' => array( 'type' => 'boolean' ),
            'auto_scan_contacts'     => array( 'type' => 'boolean' ),
            'engage_hostiles'        => array( 'type' => 'boolean' ),
            'alert_human_conditions' => array(
                'type'  => 'array',
                'items' => array( 'type' => 'string' ),
            ),
        ),
    ),
    'execute_callback' => function() {
        return get_option( 'helm_ai_standing_orders', array(
            'shield_alert_threshold' => 20,
            'auto_reinforce_shields' => true,
            'auto_scan_contacts'     => true,
            'engage_hostiles'        => false,
            'alert_human_conditions' => array(
                'shields_critical',
                'hostile_contact',
                'system_failure',
                'power_emergency',
            ),
        ));
    },
    'permission_callback' => fn() => current_user_can( 'helm_view_power' ),
    'meta' => array( 'show_in_rest' => true ),
));
```

### Example Standing Orders UI

Humans configure via WordPress admin:

- **Shield threshold**: Alert me when shields drop below ____%
- **Auto-reinforce**: Automatically reinforce shields under fire
- **Auto-scan**: Automatically scan new contacts
- **Engage hostiles**: Never / Defensive only / At discretion
- **Wake conditions**: What situations require human attention

---

## Alert Escalation

AI crew should know when to wake the human:

```php
wp_register_ability( 'helm/alert-human', array(
    'label'       => __( 'Alert Human Crew', 'helm' ),
    'description' => __( 'Send notification to human crew members.', 'helm' ),
    'category'    => 'helm-command',
    'input_schema' => array(
        'type'       => 'object',
        'properties' => array(
            'priority' => array(
                'type' => 'string',
                'enum' => array( 'info', 'warning', 'critical' ),
            ),
            'message' => array(
                'type'      => 'string',
                'maxLength' => 500,
            ),
            'situation' => array(
                'type'        => 'string',
                'description' => 'Structured situation code',
            ),
        ),
        'required' => array( 'priority', 'message' ),
    ),
    'execute_callback' => function( $input ) {
        // Send push notification, email, SMS, etc.
        return helm( AlertSystem::class )->notifyHumans( $input );
    },
    'permission_callback' => fn() => current_user_can( 'helm_view_power' ),
));
```

---

## Architecture Integration

### Ability Provider

Each system registers its own abilities:

```php
// src/Helm/Systems/Shields/Provider.php

class Provider extends ServiceProvider {
    public function register(): void {
        // ... existing registration
    }

    public function boot(): void {
        add_action( 'wp_abilities_api_init', [ $this, 'registerAbilities' ] );
    }

    public function registerAbilities(): void {
        wp_register_ability( 'helm/shields-status', ... );
        wp_register_ability( 'helm/shields-reinforce', ... );
        wp_register_ability( 'helm/shields-modulate', ... );
    }
}
```

### Category Registration

Group abilities by system:

```php
add_action( 'wp_abilities_api_categories_init', function() {
    wp_register_ability_category( 'helm-defense', array(
        'label'       => __( 'Defense Systems', 'helm' ),
        'description' => __( 'Shield and defensive operations', 'helm' ),
    ));

    wp_register_ability_category( 'helm-sensors', array(
        'label'       => __( 'Sensor Systems', 'helm' ),
        'description' => __( 'Scanning and detection operations', 'helm' ),
    ));

    // ... other categories
});
```

---

## Workflow Example

### AI Crew Response to Attack

1. **Sensors detect incoming fire**
   - AI calls `helm/sensors-contacts` - sees hostile
   - AI calls `helm/standing-orders` - checks rules of engagement

2. **Shields take hit**
   - AI calls `helm/shields-status` - sees 60% strength, fore arc damaged
   - Standing orders say auto-reinforce is enabled
   - AI calls `helm/shields-reinforce` with `{ arc: 'fore', percentage: 75 }`

3. **Situation escalates**
   - Shields drop to 18% (below 20% threshold)
   - AI calls `helm/alert-human` with critical priority
   - Human receives push notification

4. **Human takes over or delegates**
   - Human logs in, assesses situation
   - Either takes manual control or updates standing orders
   - AI continues operating within new parameters

---

## Security Considerations

### Authentication

- AI crew gets WordPress user account with custom role
- Application passwords or OAuth for API access
- MCP Adapter handles credential management

### Audit Trail

Log all AI actions:

```php
add_action( 'helm_ability_executed', function( $ability, $input, $output, $user_id ) {
    if ( user_can( $user_id, 'helm_ai_officer' ) ) {
        helm( AuditLog::class )->record( array(
            'actor'   => 'ai_crew',
            'ability' => $ability,
            'input'   => $input,
            'output'  => $output,
            'time'    => current_time( 'mysql' ),
        ));
    }
}, 10, 4 );
```

### Rate Limiting

Prevent runaway AI from overwhelming systems:

```php
'permission_callback' => function() {
    if ( ! current_user_can( 'helm_operate_shields' ) ) {
        return false;
    }

    // Rate limit: max 10 shield operations per minute
    $recent = get_transient( 'helm_ai_shield_ops_' . get_current_user_id() );
    if ( $recent >= 10 ) {
        return new WP_Error( 'rate_limited', 'Too many operations' );
    }

    return true;
},
```

---

## References

- [Introducing the WordPress Abilities API](https://developer.wordpress.org/news/2025/11/introducing-the-wordpress-abilities-api/)
- [Abilities API in WordPress 6.9](https://make.wordpress.org/core/2025/11/10/abilities-api-in-wordpress-6-9/)
- [WordPress MCP Adapter](https://github.com/WordPress/mcp-adapter)
- [WordPress.com MCP Documentation](https://developer.wordpress.com/docs/mcp/)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
