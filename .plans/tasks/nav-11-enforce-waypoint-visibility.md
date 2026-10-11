---
status: draft
area: navigation
priority: p2
---

# Add private node discoveries

## Problem

Edge discoveries belong to individual players, but navigation nodes are globally
readable by any logged-in player. The node API allows listing waypoints and
fetching their coordinates by ID without checking discovery. The client can
fetch the entire node collection, so hiding undiscovered locations in the map
alone does not enforce private exploration.

Waypoints are shared locations generated from deterministic route inputs.
Discovering one should reveal it only to the discovering player. Another
player must discover that same location independently before it appears on
their map or becomes accessible through player-facing APIs.

Visible stars are public because players can observe them. That does not make
every location public. Future hidden black holes, rogue planets between stars,
and wormhole entrances need the same private discovery model. Deriving all node
knowledge from discovered edges cannot represent finding a location without
also finding a travel connection.

## Proposed solution

Give nodes an explicit public or hidden visibility policy, separate from their
type or attached celestial content. Preserve public access for existing visible
star systems and make waypoints hidden by default. Allow future hidden
locations to use the same policy without implementing their gameplay here.

Persist node discoveries per player, with the original discovery time preserved
when discovery is repeated. Knowledge belongs to the player across ships,
sessions, browsers, and devices. Keep the underlying nodes and deterministic
waypoint identity shared across players.

Record newly revealed node knowledge alongside edge knowledge as each route-scan
checkpoint resolves. Preserve discoveries when a scan stops or its action data
is later removed. Support node discoveries independently of edges. Knowing two
locations must not grant knowledge of a connection between them. In particular,
knowing a wormhole entrance must not automatically reveal its exit or connection.

Enforce public-or-discovered visibility consistently across player-facing node
lists, pagination totals, individual and bulk lookups, related data, and any
abilities exposing locations. Guessing a hidden node ID must not reveal its
existence or coordinates, or allow it to be selected as a route-scan target.
Apply the same knowledge rule to player-selected navigation targets while
preserving existing discovered-edge requirements for travel. Internal universe
generation and authorized administrative access must remain able to use the
shared world data.

Make client loading, discovery updates, and map rendering reflect the player's
known nodes, including discoveries without incident edges. Keep hidden-node
caches isolated between players and invalidate previously cached global waypoint
data. Preserve the datacore requirement that authorized nodes are available
before edges referencing them are written. A cold client must rebuild the same
knowledge as an existing session.

Preserve existing exploration progress when introducing the policy. Derive
initial node discoveries from each player's known edge endpoints and account
for ships already at hidden locations or traveling along known routes. Do not
grant knowledge merely because a waypoint exists globally or was previously
fetched through the unrestricted API.

Update navigation documentation to describe the enforced visibility policy.
Verify cross-player isolation, public-star access, hidden-node lookup and target
rejection, repeated and interrupted scan discoveries, independent node discovery,
existing-progress migration, and client cache isolation and rebuilding.

This task provides private waypoint discovery and the common foundation for
other hidden locations. Generating or detecting new celestial objects, wormhole
travel mechanics, discovery trading, team sharing, public-route promotion, and
changes to route seeding are outside its scope.
