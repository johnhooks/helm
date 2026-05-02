# Stations

Player-built infrastructure that defines territory, economy, and politics.

## Two Kinds of Stations

**NPC stations** exist in core systems. They're generated with the universe (see `generation.md`), provide baseline services, and enforce hisec security. They don't change hands, don't have configurable policies, and serve as the stable economic backbone.

**Player stations** are built in frontier and deep frontier systems. They're expensive, take time to construct, and represent a serious investment. A player station is the single most significant thing a player (or group) can build. It transforms a system from empty space into claimed territory.

## Building a Station

Stations aren't purchased — they're constructed over time from hauled materials.

### Requirements

-   A system with no existing player station (one per system)
-   A ship present in the system to begin construction
-   Large quantities of refined materials (metals, composites, rare elements)
-   Multiple real-time days of construction

### Construction Phases

**Foundation.** Deploy the station core. This is a single expensive action — the commitment point. Once placed, the station exists as a skeleton. It can't do anything yet, but it's visible and claimable.

**Infrastructure.** Haul materials to build out systems: docking bays, cargo storage, market terminals, defensive systems. Each module requires specific materials and takes hours to install.

**Activation.** Once minimum infrastructure is in place, the station comes online. It can dock ships, store cargo, and run a market. Additional modules improve capability over time.

Construction is interruptible. Another player could find your half-built station and contest it before it's operational. Building in a remote system is safer but harder to supply. Building near trade routes is convenient but visible.

## Station Services

A player station provides services based on its installed modules:

-   **Docking.** Ships can dock for shelter, storage, and access to other services. The owner sets docking permissions and fees.
-   **Market.** Buy and sell goods. The owner sets tax rates. A station with good prices and selection attracts traffic.
-   **Repair.** Component repair and maintenance. Requires stocked materials.
-   **Refuel.** Core recharge and capacitor top-off.
-   **Shipyard.** Commission new ships, swap components. Advanced module.
-   **Storage.** Secure cargo storage beyond what a ship can carry.

Not every station has every service. A mining outpost might have docking and storage but no shipyard. A trade hub invests in market and repair. The owner decides what to build based on what they want the station to be.

## Ownership

### Solo Ownership

A single player can own and operate a station. They control all policies, collect all fees, and handle all maintenance. Viable for a small outpost but difficult to scale — a busy station needs attention.

### Organizations

Players can form organizations (corps, guilds, cooperatives — the name is TBD) to share station ownership. An organization is a lightweight membership layer:

-   **Shared ownership.** Multiple players can manage a station. Permission tiers determine who can change security policy, access the treasury, modify modules, or grant docking rights.
-   **Shared finances.** A corp wallet that docking fees and market taxes feed into. Transparent to members with appropriate permissions.
-   **Roles, not ranks.** Functional permissions (station manager, fleet coordinator, recruiter, treasurer) rather than a military hierarchy. Keep it flat and functional.
-   **Comms.** In-game communication channel for the group. Tied to the ship's computer log system.

The organization doesn't grant mechanical advantages. Two solo players with good stations are just as powerful as a two-person org with the same stations. The org just makes coordination easier — shared access, shared funds, shared comms.

### Ownership Transfer

Stations can change hands through:

-   **Sale.** The owner sells the station to another player or org. A market transaction like any other.
-   **Abandonment.** An owner who stops playing eventually loses their station. Maintenance lapses, systems degrade, and after a threshold the station becomes claimable.
-   **Siege.** Hostile takeover. See `conflict.md` for siege mechanics. The typical outcome is a change of hands, not destruction.

## Station Combat

Stations are the most durable thing in the game. Taking one requires coordination, time, and risk. Destroying one is almost never worth it. The typical outcome of station combat is a change of hands.

### Siege

A siege is a sustained campaign — days of real time, multiple ships, continuous exposure. See `conflict.md` for the attacker's perspective. From the station's side:

**Stations aren't defenseless.** A station projects defensive effects across its system (see `stellar-effects.md`). Weapons platforms target hostile ships. Shield systems absorb damage. The station can sustain fire far longer than any ship can dish it out. A solo attacker can't even scratch a well-maintained station.

**Reinforcements have time.** Because sieges take days, allied ships have time to travel to the system. A station under siege broadcasts its status — org members, allies, even mercenaries can respond. The attackers know reinforcements are coming. The question is whether they can breach the station before help arrives.

**Attackers are exposed.** A siege fleet is the loudest thing in the game. Multiple ships holding position, running weapons, broadcasting constantly. Every ship in the region knows. Third parties — bounty hunters, rival factions, opportunists — can intervene. The attackers can't hide.

**The breach.** A successful siege doesn't blow the station up. It breaches the station's defenses enough to force an ownership transfer. The station's systems are damaged but intact. The new owner inherits the infrastructure and begins repairs.

### Sabotage

Not all station attacks are frontal assaults. Covert operations can weaken a station from within:

-   **System disruption.** Disabling specific station modules — take out the security systems before the fleet arrives, knock the market offline to hurt revenue, degrade the shields to soften the station for siege.
-   **Supply interdiction.** Intercept haulers supplying the station. A station that can't resupply degrades faster. Its security systems weaken, its repair bay runs dry, its market empties.
-   **Espionage.** Infiltrate the owning organization. Gain access, change permissions, lower defenses at a critical moment. Social engineering as gameplay.

Sabotage is slower and subtler than siege. It's prep work — weakening a target before committing the fleet. A well-prepared siege might be over quickly because saboteurs already did the hard part.

### Station Defense Rules

**Defense is always permissible.** Destroying an attacking ship during station defense carries no bounty and no reputation penalty. Ever. The station owner, their allies, and any ship that joins the defense can destroy attackers without consequence.

This is the one context where ship destruction is expected and unpunished. The attackers chose to assault a station — they accepted the risk of losing their ships. The defenders are protecting an investment that took weeks to build. The game doesn't punish them for it.

This asymmetry is intentional:

-   **Attackers** risk ship destruction with no bounty protection. They're the aggressors.
-   **Defenders** can destroy freely. They're protecting property.
-   **Third parties** who join the defense also destroy freely. The station broadcast is an open call for help.
-   **Third parties** who join the attack share the attackers' risk and reputation consequences.

A pirate who interdicts ships in open space faces bounties for destruction. A defender who destroys that same pirate's ship during a station siege faces nothing. Context matters.

### Why Stations Survive

Stations change hands. They rarely cease to exist. A station is too valuable to destroy — someone spent weeks building it, and the infrastructure is the prize. The attacker wants to _own_ it, not delete it.

Actual destruction requires sustained effort well beyond what it takes to breach and seize. A group that destroys a station instead of taking it is making a statement so expensive that the entire server notices. And the defenders can always scuttle — transfer assets, evacuate cargo, and abandon the station before it falls, denying the attackers the prize they came for.

### Post-Siege Salvage

A siege leaves the system littered with wrecks from both sides. Destroyed ships don't vanish — they become salvageable wrecks containing damaged but recoverable components (see `conflict.md`). The aftermath of a major station battle is an economic event:

-   **Defenders** recover allied wrecks, repair experienced components, rebuild.
-   **Attackers** may have losses of their own to collect — siege ships are expensive.
-   **Salvagers** converge from across the region. Experienced components from combat-fitted ships are high-value salvage. A siege graveyard is a gold rush.
-   **The winning side** might not control the field long enough to collect everything. A freshly-seized station needs immediate attention — repairs, restocking, policy changes. Meanwhile, scavengers pick through the debris.

Major sieges become landmarks. "The Battle of Kepler" isn't just a story — it's a debris field that salvagers work for weeks.

## Security Policy

The station owner's most important decision. See `conflict.md` for full details on the security zone model. In summary:

**Counter PVP.** The station actively responds to hostile actions in its system. Attracts peaceful traffic but makes the station a target for siege.

**Allow PVP.** The station doesn't intervene. Keeps the station off pirate hit lists but drives away peaceful players.

**Tax PVP.** The station takes a cut of piracy proceeds. Profitable but reputationally complicated.

**Selective enforcement.** Allies are protected, strangers aren't. Creates a faction dynamic.

The security policy is implemented through the stellar effects system (see `stellar-effects.md`). A station's security response is a player-sourced effect that applies to ships in its system.

## Territory

Territory isn't declared — it's built. A player station _is_ the territory claim.

### Emergent Factions

A group that builds three stations across adjacent systems has created a corridor. They set compatible security policies, their markets feed each other, their defenses cover the routes between them. That's a faction — not because they clicked "create faction" in a menu, but because they built something together that functions as one.

### Territory as Maintenance

Territorial control is maintenance, not conquest. Stations need supplies, markets need stock, security needs active enforcement. A faction that stops playing doesn't lose a war — their stations just become less relevant. Markets dry up, security lapses, pilots dock elsewhere. Territory decays through neglect, not defeat.

A small group with one well-run station in a good location can matter more than a large group with five neglected ones. Territory isn't about how much you hold — it's about how well you run what you have.

### Strategic Value

Station placement is strategic:

-   **Trade route intersections.** High traffic, high docking fees, competitive markets. Contested.
-   **Resource-rich sectors.** Miners need somewhere to sell. The station nearest to the best belts wins.
-   **Chokepoints.** If a rich sector is only reachable through one or two systems, a station there controls access.
-   **Deep frontier.** Remote but safe from siege. The last resupply point before the void. Explorers pay premium prices.

## Station Economy

### Revenue

-   **Docking fees.** Per-dock charge. The owner sets the rate.
-   **Market tax.** Percentage of every transaction on the station's market.
-   **Repair fees.** Markup on repair services.
-   **Storage fees.** Recurring charge for stored cargo.

### Costs

-   **Maintenance.** Stations degrade like ships. Systems need materials and attention.
-   **Security.** Running a counter-PVP policy costs resources — the station's defensive systems consume power and wear down.
-   **Stocking.** A repair bay needs materials. A market needs inventory (or enough traders to self-stock).

A well-run station is profitable. A neglected station bleeds resources until it's not worth keeping.

### NPC Station Interaction

Player stations compete with NPC stations in the core. NPC stations have stable prices, reliable services, and security — but they're in depleted core systems with thin margins. Player stations in frontier systems offer access to richer resources but with less stability and more risk.

The economy naturally creates a gradient: NPC stations are safe and boring. Player stations are dynamic and interesting. The best markets emerge where the most players choose to trade.
