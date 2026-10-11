# Game abilities

Helm exposes player operations and shared catalog reads through the WordPress Abilities API (WordPress
6.9+). Each ability declares its inputs, outputs, permissions, and whether it
changes state. These operations use the same action factory and public action
serializer as the REST API. They operate on the running game's database.

## Code structure

Abilities are grouped by data scope under `src/Helm/Abilities`:

- `Player/`: owned ships, player discoveries, and ship actions. Contains
  `ListShips`, `InspectShip`, `ListScanTargets`, `ListKnownEdges`, `ScanRoute`,
  `Jump`, `GetAction`, and `CancelAction`.
- `System/`: star-system details and product catalog reads: `InspectSystem`,
  `ListProducts`, and `GetProduct`. This is a
  data scope, not an administrator permission level.
- `Support/`: shared collection/action schemas and action submission diagnostics.
- `Provider.php` and `McpServer.php`: registration and optional MCP transport.

Each ability defines `register()`, `canExecute()`, and `execute()`, and receives
only the services it uses. Add new abilities to the Provider's registration list
and the MCP server's explicit tool list when exposing them over MCP. Game rules
remain in existing services. Classes are imported with `use` declarations.

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
| `helm/cancel-action` | `action_id` | Updated action after stopping a route scan; finished actions are unchanged |
| `helm/inspect-system` | `node_id` | Published stars linked to a system: catalog IDs, spectral types, distance from Sol, physical properties, confirmed planet counts |
| `helm/list-products` | Optional `type`, `page`, `per_page` | Component blueprint summaries, including all versions |
| `helm/get-product` | `product_id` | Exact blueprint version and raw component stats |

Pages default to 20 items and are limited to 100. Collection results include
`total`, `page`, and `has_more`. Read all known-edge pages when planning a route.
Edges are traversable in either direction; their order must form a continuous
path from the ship's current node to the target. The server validates ownership,
discovery, route continuity, and normal gameplay constraints on submission.

Ship and action access requires ownership, including for administrators. No
ability accepts a caller-supplied owner. Scan targets expose star names and
distances, and `has_discovered_route`: whether this player has discovered a direct
edge from the current node to that target. The flag does not mean indirectly
reachable or previously scanned. It is fetched in one query limited to the
current page of target IDs; empty pages skip that lookup. Global route discovery
information is not exposed. `has_any_discovered_route` indicates whether any edge
this player has discovered touches the target. It includes disconnected graph
components and does not guarantee a path from the ship. It uses one additional
query restricted to the current page of target IDs, skipped for empty pages.
Both repository lookups reject more than 100 input IDs with an
`InvalidArgumentException` before querying. Duplicates count toward the limit;
the scan-target page schema uses that same repository limit. Action output excludes
private runtime history, random rolls, and future outcomes.

System abilities require a logged-in player but no ship ownership. System
inspection accepts the node IDs returned by ship inspection or scan targets;
it reads published catalog stars, not route discoveries or generated planets.
Missing physical values are `null`, and distances are measured from Sol.

Products describe blueprints, not inventory, stock, prices, or effective ship
performance. Catalog types are `core`, `drive`, `sensor`, `shield`, and `nav`.
`list-products` sorts by ID and includes old versions. It currently reads the
matching catalog through the existing repository, then paginates in memory;
it does not introduce a repository pagination method. `get-product` describes
the type-dependent meanings of the raw stat columns in its tool description.

From the plugin directory inside the WordPress environment:

```bash
wp --user=admin eval-file bin/run-ability.php helm/inspect-system '{"node_id":21}'
wp --user=admin eval-file bin/run-ability.php helm/list-products '{"type":"sensor"}'
wp --user=admin eval-file bin/run-ability.php helm/get-product '{"product_id":1}'
```

Use IDs from your installation. Tests mirror `Player/` and `System/`, with one
class per ability. Each test class composes its own fixtures with existing Helm
helpers; there is no shared, fixed ability scenario.

## Action cancellation

`helm/cancel-action` accepts `{"action_id": 123}`. The MCP Adapter exposes it as
`helm-cancel-action`. It shares the `ActionCancellation` service with
`POST /helm/v1/actions/{actionId}/cancel`; both enforce ship ownership.

Currently only route scans can be stopped. Stopping preserves discoveries,
completed cycles, and power already spent, but does not run the pending cycle.
The result reports `progress.stop_reason: "player_stopped"`; the action becomes
`partial` with discoveries or `fulfilled` without them. The next checkpoint is
cleared and the ship is available immediately. A subsequent scan retains known
connections but starts with zero accumulated work.

The service locks the action row and reads fresh state before changing it.
If a queue worker already holds a processing claim, cancellation returns
`helm.action.in_progress` (HTTP 409). Inspect the action and retry after that
update; this error does not mean the scan stopped. Otherwise cancellation wins
over unclaimed overdue work. Repeated cancellation returns finished actions
unchanged and emits no duplicate updates.

Jump cancellation returns `helm.action.cancellation_unsupported`; stopping at
the next waypoint is a separate follow-up. The scan card button is not wired
yet. Refresh MCP tool discovery after deploying the ability.

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

## Local MCP server (Lando)

```bash
lando rebuild -y         # once after pulling the port/tooling changes
lando mcp-setup admin    # optional argument: WordPress player login
```

`lando mcp-setup` runs `bin/setup-mcp-adapter.sh`. Setup installs the
pinned official WordPress MCP Adapter **0.7.0**, activates it, enables
`HELM_MCP_ENABLED`, and disables debug display (logging stays enabled) so PHP
notices do not corrupt protocol responses. It requires `WP_ENVIRONMENT_TYPE=local`.
Repeated setup retains a saved, unrevoked application password for that player.

The dedicated server ID is `helm`, with ten directly discoverable tools.
MCP names replace the ability slash with a hyphen, e.g. `helm-inspect-ship`.
The endpoint is:

```text
https://helm.lndo.site:6010/?rest_route=/helm-mcp/v1/server
```

The query route works even when WordPress pretty permalinks are disabled.
Lando publishes HTTPS on **127.0.0.1:6010**. This is a local development setup;
the route is also reachable through Lando's normal site URL. The dedicated
server registers only when the local environment and enable flag both match.
The adapter also provides its own default server; this switch does not disable
that plugin's independent routes.

Credentials are stored in gitignored `tmp/mcp/connection.json` with mode 0600,
inside a mode 0700 directory. They authenticate as the selected player, so ship
ownership checks still apply, including to administrators. Application passwords
carry that account's WordPress permissions; they are not scoped exclusively to
Helm. Prefer a player account for agent experiments. Revoke the named
`Helm local MCP harness` password in the user's WordPress profile when finished;
rerunning setup then generates a replacement. Switching players creates another
password; revoke the previous player's password separately if no longer needed.

For an MCP-capable agent client, configure an HTTP MCP connection with the saved
`url` and an `Authorization` header containing the saved `authorization` value.
Trust the Lando CA (`~/.lando/certs/LandoCA.crt`) in that client's runtime.
Keep credentials in local client configuration, never tracked project files.
Helm execution failures preserve `isError: true`
and include JSON diagnostic text containing error codes, messages, and error
data. Action rejection data includes the ship, action type, parameters, and
next-step guidance. The adapter's earlier permission failures remain ordinary
MCP error text; HTTP authentication failures retain their HTTP response body.
No stack traces or private scan outcomes are returned. The same tools can support
a future model-driven autopilot;
this setup does not add an autonomous decision loop.

To stop the dedicated server, set `HELM_MCP_ENABLED` to false in local wp-config.
Deactivate `mcp-adapter` to stop all adapter servers. Remove the Lando port mapping
and rebuild if the dedicated port is no longer wanted. The direct WP-CLI harness
and Abilities REST routes work independently of the MCP plugin.

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
