# Player abilities

Helm exposes player operations through the WordPress Abilities API (WordPress
6.9+). Each ability declares its inputs, outputs, permissions, and whether it
changes state. These operations use the same action factory and public action
serializer as the REST API. They operate on the running game's database.

## Available operations

| Ability                  | Inputs                                               | Result                                                        |
| ------------------------ | ---------------------------------------------------- | ------------------------------------------------------------- |
| `helm/list-ships`        | Optional `page`, `per_page`                          | Ships owned by the authenticated player                       |
| `helm/inspect-ship`      | `ship_id`                                            | Operational state, current power, core life, effective ranges |
| `helm/list-scan-targets` | `ship_id`; optional `page`, `per_page`               | Nearby star systems within sensor range                       |
| `helm/list-known-edges`  | Optional `page`, `per_page`                          | Only the player's discovered edges                            |
| `helm/scan-route`        | `ship_id`, `target_node_id`                          | Queued scan action                                            |
| `helm/jump`              | `ship_id`, `from_node_id`, `target_node_id`, `route` | Queued jump along ordered discovered edge IDs                 |
| `helm/get-action`        | `action_id`                                          | Public action status, progress, and next checkpoint           |

Pages default to 20 items and are limited to 100. Collection results include
`total`, `page`, and `has_more`. Read all known-edge pages when planning a route.
Edges are traversable in either direction; their order must form a continuous
path from the ship's current node to the target. The server validates ownership,
discovery, route continuity, and normal gameplay constraints on submission.

Ship and action access requires ownership, including for administrators. No
ability accepts a caller-supplied owner. Scan targets expose star names and
distances, not global route discovery information. Action output excludes
private runtime history, random rolls, and future outcomes.

## Local harness

The harness invokes the registered ability's `execute()` method, including its
schema validation and permission callback. Select the player with WP-CLI's
`--user`; an invocation without a logged-in player is rejected.

From a WordPress environment, with the working directory set to the Helm plugin:

```bash
wp --user=admin eval-file bin/run-ability.php helm/list-ships '{}'
wp --user=admin eval-file bin/run-ability.php helm/inspect-ship '{"ship_id":42}'
wp --user=admin eval-file bin/run-ability.php helm/list-scan-targets '{"ship_id":42}'
wp --user=admin eval-file bin/run-ability.php helm/list-known-edges '{}'
```

For this repository's running Lando app:

```bash
docker exec --user www-data \
  --workdir /app/wp-content/plugins/helm helm_appserver_1 \
  wp --user=admin eval-file bin/run-ability.php helm/list-ships '{}'
```

Use returned IDs when submitting actions. These examples change game state:

```bash
wp --user=admin eval-file bin/run-ability.php helm/scan-route \
  '{"ship_id":42,"target_node_id":9}'
wp --user=admin eval-file bin/run-ability.php helm/get-action '{"action_id":123}'
wp --user=admin eval-file bin/run-ability.php helm/jump \
  '{"ship_id":42,"from_node_id":1,"target_node_id":9,"route":[12,15]}'
```

Submission returns immediately. `deferred_until` is the next checkpoint, not a
promise that the entire route or scan will finish then. Reads do not process
queued actions. Cron runs the normal processor; `wp helm action process` can
process actions that are already due. It does not advance time.

Submissions are not idempotent. After an ambiguous transport failure, inspect the
ship's `state.current_action_id` and read that action before retrying. Do not poll
continuously: check at or after the returned checkpoint. Time acceleration is
separate work tracked in `.plans/tasks/dev-01-time-scale-constant.md`.

## Remote AI clients

Abilities opt into the core authenticated REST surface with `meta.show_in_rest`.
Read operations use GET; submissions use POST. For example:

```text
GET /wp-json/wp-abilities/v1/abilities/helm/inspect-ship/run?input[ship_id]=42
POST /wp-json/wp-abilities/v1/abilities/helm/scan-route/run
{"input":{"ship_id":42,"target_node_id":9}}
```

Use WordPress REST authentication, such as an application password for the
player's account over HTTPS. The transport authenticates the user; ability
permissions still enforce ownership.

The abilities also set `meta.public` and `meta.mcp.public` for discovery through
the official WordPress MCP Adapter when that plugin is installed and configured.
Helm does not install the adapter, provision credentials, or connect an AI client.
The local harness and REST API work without it. Public discovery metadata does
not grant anonymous execution access.

See the [Abilities API PHP reference](https://developer.wordpress.org/apis/abilities-api/php-reference/)
and [MCP Adapter](https://github.com/WordPress/mcp-adapter).

## Verification

```bash
slic run Wpunit Abilities
composer analyse
composer lint
```

Integration tests exercise registered abilities on WordPress with real database
fixtures: player isolation, input rejection, discovery boundaries, asynchronous
action submission, private-state omission, and execution over the abilities REST
endpoint. Tests use the test database, not the running app's ships.
