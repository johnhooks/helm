# System abilities

Shared reference data, independent of a player's owned ships:

- `InspectSystem`: published catalog stars for a system node.
- `ListProducts`: component blueprint summaries, filtered by type and paginated.
- `GetProduct`: one exact product version and its raw stats.

All require authentication and are read-only. System describes data scope, not
administrator privileges. Keep player discoveries in Player abilities.

Each class owns its schema, permission callback, and execution callback. Add
new abilities to Provider and to the explicit tool list in McpServer.
