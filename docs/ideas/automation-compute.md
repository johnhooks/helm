# Ship Automation: Onboard Compute System

_Players write JavaScript to automate their ships. The ship's computer runs it — slowly, constrained, and on a budget._

---

## Overview

Players can upload automation scripts that tell their ship what to do next. Scripts are JavaScript, executed in sandboxed V8 isolates with hard resource limits. The system is modeled after Cloudflare Workers: code goes in, a JSON response comes out, nothing else.

The ship's onboard computer is a real in-game resource. It has a compute budget (cycles), a memory ceiling (bytes), and a wall-time limit per execution. These constraints are intentionally tight. Writing efficient code isn't just good practice — it's a gameplay skill.

## Architecture

### V8 Isolates via `isolated-vm`

Each script execution spins up a V8 isolate — a completely sandboxed JavaScript environment with:

-   **No access to Node.js APIs** — no `require`, no `fs`, no `net`, no `process`
-   **No network access** — no `fetch`, no `XMLHttpRequest`, no WebSockets
-   **No timers** — no `setTimeout`, no `setInterval`
-   **No global state between executions** — each run is a fresh isolate
-   **Hard memory limit** — isolate is terminated if exceeded
-   **Hard wall-time limit** — isolate is killed mid-execution if it runs too long

From our infrastructure's perspective, the worst case is trivial. A script that tries to burn compute hits the wall-time limit (e.g. 50ms real time), gets killed, and the player loses those cycles from their budget. A malicious player who repeatedly submits bad scripts exhausts their daily budget in a few attempts — maybe 250ms of our actual compute — and then they're done until the budget resets.

### Execution Flow

```
1. Player uploads a script
2. Action Scheduler triggers the script on a game tick
3. System collects the ship's current state (location, cargo, fuel, surroundings, etc.)
4. A V8 isolate is created with the game-tick's resource limits
5. Ship state is injected as a frozen, read-only object
6. A constrained API shim is injected (the "Onboard API")
7. The script executes
8. The script returns a JSON response matching an expected action schema
9. The isolate is destroyed
10. The response is validated and queued through normal action processing
```

Scripts never _do_ anything directly. They declare intent. The server validates and executes.

### Sidecar Service

Since the game server is WordPress/PHP, script execution runs as a small Node.js sidecar service. PHP calls into it via internal HTTP or WP-CLI when a script needs to run. The sidecar manages isolate lifecycle, enforces limits, and returns results.

## The Onboard API

Scripts receive a minimal, read-only API surface. This is all a script can see:

```typescript
interface OnboardContext {
	/** Current ship state — read only */
	ship: {
		id: string;
		name: string;
		location: { system: string; node: string };
		fuel: number;
		maxFuel: number;
		cargo: CargoItem[];
		cargoCapacity: number;
		credits: number;
		driveRange: number;
		shields: number;
		status: 'idle' | 'traveling' | 'scanning' | 'mining' | 'docked';
	};

	/** What's around the ship — read only */
	surroundings: {
		stars: Star[];
		planets: Planet[];
		asteroids: Asteroid[];
		stations: Station[];
		ships: ShipContact[];
		anomalies: Anomaly[];
	};

	/** Results from the last action, if any */
	lastResult: ActionResult | null;

	/** Current game tick number */
	tick: number;
}
```

The script's job is to return a single action:

```typescript
interface AutomationResponse {
	/** The action to take */
	action: 'navigate' | 'scan' | 'mine' | 'dock' | 'undock' | 'trade' | 'idle';

	/** Action-specific parameters */
	params?: Record<string, unknown>;

	/** Optional log message (stored in ship's computer log) */
	log?: string;
}
```

### Example Scripts

**Simple: dock when low on fuel**

```js
export default function ({ ship, surroundings }) {
	if (ship.fuel < ship.maxFuel * 0.2 && surroundings.stations.length > 0) {
		return {
			action: 'dock',
			params: { target: surroundings.stations[0].id },
			log: `Fuel low (${ship.fuel}). Docking at ${surroundings.stations[0].name}.`,
		};
	}
	return { action: 'idle' };
}
```

**Intermediate: scan-then-mine loop**

```js
export default function ({ ship, surroundings, lastResult }) {
	// If we just finished a scan, mine the best asteroid
	if (lastResult?.action === 'scan' && surroundings.asteroids.length > 0) {
		const best = surroundings.asteroids.sort(
			(a, b) => b.yield - a.yield
		)[0];
		return {
			action: 'mine',
			params: { target: best.id },
			log: `Mining ${best.name} (yield: ${best.yield}).`,
		};
	}

	// If cargo is full, head to nearest station
	if (ship.cargo.length >= ship.cargoCapacity) {
		const station = surroundings.stations[0];
		if (station) {
			return { action: 'dock', params: { target: station.id } };
		}
	}

	// Otherwise, scan
	return { action: 'scan' };
}
```

**Advanced: multi-system exploration**

```js
export default function ({ ship, surroundings }) {
	// Prioritize unvisited stars within drive range
	const reachable = surroundings.stars.filter(
		(s) => s.distance <= ship.driveRange && !s.visited
	);

	if (reachable.length > 0) {
		// Pick the closest unvisited star
		const target = reachable.sort((a, b) => a.distance - b.distance)[0];
		return {
			action: 'navigate',
			params: { target: target.id },
			log: `Heading to unvisited system: ${target.name} (${target.distance} ly).`,
		};
	}

	// Nothing new in range — scan current system
	return {
		action: 'scan',
		log: 'No new systems in range. Scanning locally.',
	};
}
```

## Resource Limits as Gameplay

### Compute Budget

Every ship has a daily compute budget measured in **cycles**. Each script execution costs cycles based on actual CPU time consumed in the isolate. `isolated-vm` provides precise CPU time measurement.

| Metric                  | Starter Ship | Mid-Tier | High-End |
| ----------------------- | ------------ | -------- | -------- |
| Cycles per day          | 256          | 1,024    | 4,096    |
| Memory ceiling          | 1 KB         | 4 KB     | 16 KB    |
| Wall time per execution | 10ms         | 25ms     | 50ms     |
| Executions per day      | ~25          | ~100     | ~400     |

These numbers are tunable. The point is: a starter ship can run a simple script a handful of times. A fully upgraded ship can run sophisticated automation all day.

### The Inflation Layer

`isolated-vm` gives us real execution metrics: CPU time in microseconds, memory in bytes. The game inflates these into in-game costs:

-   **Real execution: 2ms** -> "Ship computer processed for 4 hours"
-   **Real memory: 800 bytes** -> "Memory usage: 78% of onboard capacity"

The player sees their ship's computer working hard. We spent 2ms. The fiction holds because the ship's computer is canonically ancient and underpowered — most of its real capacity is consumed by the AI crew's consciousness.

### Programming as Progression

The constraints create a natural difficulty curve:

1. **Early game** — Tiny budget, simple scripts. "If low fuel, dock." Players learn the basics.
2. **Mid game** — Enough budget for conditional logic and state-aware decisions. Players start writing real automation.
3. **Late game** — Upgraded computers allow complex multi-step routines. The challenge shifts to optimization — can you do more with the same budget?

Bad code is punished by the system, not by admins. An `O(n²)` loop costs more cycles than an `O(n)` approach. A script that allocates unnecessary objects burns memory. Players who learn to write tight, efficient code extract more value from their compute budget.

This makes programming skill a genuine progression axis alongside ship hardware, navigation, and economy.

### Community & Competition

-   **Script sharing** — Players can share scripts. A well-optimized community script becomes valuable.
-   **Optimization challenges** — "Solve this automation problem in under 50 cycles" as community events.
-   **Leaderboards** — Most efficient scripts for common tasks.
-   **Script marketplaces** — Players sell automation scripts to non-coders for in-game credits.

## Security Model

### What the Isolate Cannot Do

-   Access the filesystem
-   Make network requests
-   Import modules
-   Access Node.js globals (`process`, `Buffer`, `require`, etc.)
-   Access other isolates or shared memory
-   Exceed its memory limit (terminated instantly)
-   Exceed its wall-time limit (terminated instantly)
-   Persist state between executions

### What the Server Validates

-   Response matches the expected `AutomationResponse` schema
-   Action is valid for the ship's current state (can't mine while traveling)
-   Action parameters reference real game entities
-   Script is within the player's compute budget before execution begins

### Abuse Scenarios

| Attack               | Outcome                                                   |
| -------------------- | --------------------------------------------------------- |
| Infinite loop        | Killed at wall-time limit. Cycles deducted. Budget spent. |
| Memory bomb          | Killed at memory limit. Cycles deducted. Budget spent.    |
| Repeated bad scripts | Budget exhausted. Ship computer offline until reset.      |
| Crypto mining        | Killed at wall-time limit. ~50ms of real compute wasted.  |
| Prototype pollution  | No shared state. Isolate is destroyed after each run.     |
| Return garbage       | Schema validation rejects it. Action defaults to idle.    |

Every abuse scenario costs the attacker their in-game compute budget while costing us almost nothing in real resources.

## Implementation Considerations

-   **Node.js sidecar** — Lightweight service, single purpose: accept script + context, return result. Managed alongside the WordPress instance.
-   **Script storage** — Scripts are stored as post meta or a custom post type. Versioned. Players can have multiple scripts and assign them to different triggers.
-   **Triggers** — Scripts run on game ticks via Action Scheduler. Could also trigger on events: "run when scan completes", "run when docking", "run when attacked."
-   **Ship computer log** — Every execution logs the result, cycles consumed, and the player's optional `log` message. Accessible from the bridge UI.
-   **Upgrades** — Computer modules are items that increase budget, memory, and wall-time limits. Found, crafted, or purchased.

## The AI Subsystem

The ship's computer has two distinct subsystems: the **script engine** (V8 isolates, described above) and the **AI core** (LLM inference). They serve different purposes, have different resource models, and can optionally talk to each other.

### Two Subsystems, Two Budgets

|                    | Script Engine                             | AI Core                                                     |
| ------------------ | ----------------------------------------- | ----------------------------------------------------------- |
| **What it runs**   | Player-written JavaScript                 | LLM inference (standing orders, reasoning, conversation)    |
| **Where it runs**  | Locally in V8 isolates on the game server | LLM API call (our server → model provider)                  |
| **Resource unit**  | Compute cycles (CPU time)                 | Tokens (input + output)                                     |
| **Our real cost**  | Negligible (~50ms per execution)          | Real money (API token costs)                                |
| **Player budget**  | Cycles per day, based on ship hardware    | Tokens per period, based on AI allocation tier              |
| **When exhausted** | Ship computer offline, fly manual         | AI "goes flat" — reverts to literal, non-reasoning behavior |
| **Abuse ceiling**  | Milliseconds of CPU time                  | Dollars of API cost                                         |

The script engine is cheap for us. V8 isolates cost almost nothing. We can be generous with cycle budgets because the inflation layer makes small real costs feel like big in-game costs.

The AI core is expensive for us. Every token is real money. This budget must be genuinely constrained — not just inflated to feel constrained, but actually limited because the cost is real.

### How the AI Core Works

Players write **standing orders** in natural language. These are instructions for what the AI crew should do when the player isn't jacked in.

```
Standing Orders:
- Explore unvisited systems within 20 ly. Prioritize G-type stars.
- If cargo hold is more than 75% full, return to Kepler Station and sell.
- Avoid systems flagged as contested.
- If fuel drops below 30%, find the nearest station and dock.
- Log anything unusual.
```

On each game tick, the AI core processes the current ship state + standing orders through an LLM call. The model interprets the orders against the current situation and returns a structured action — the same `AutomationResponse` schema the script engine uses.

```
Ship state + Standing orders → LLM → AutomationResponse → Action queue
```

The output is identical to what a script produces. The action pipeline doesn't care whether the decision came from a V8 isolate or an LLM. It validates and executes either way.

### Token Budget

The AI core has a token budget. Every LLM call costs tokens — input tokens (ship state + standing orders + system prompt) and output tokens (the reasoning + action response).

A single AI decision might cost ~500-1,500 tokens depending on context complexity. The budget determines how many decisions the AI can make per period before it goes flat.

| AI Tier  | Tokens per Period | Rough Decisions                | Behavior When Exhausted                                            |
| -------- | ----------------- | ------------------------------ | ------------------------------------------------------------------ |
| Basic    | Low               | A handful                      | AI goes flat. Follows last standing order literally. No reasoning. |
| Standard | Moderate          | Enough for regular check-ins   | AI goes flat mid-cycle. Resumes when budget resets.                |
| Advanced | High              | Sustained autonomous operation | Rarely goes flat unless orders are unusually complex.              |

The exact numbers depend on real API costs and need to be tuned against what we can sustain. Unlike the script engine where we inflate fake costs, the AI budget reflects a genuinely scarce resource.

### The Dangerous Part: AI Writes Scripts

Here's where the two subsystems link up.

A player could issue a standing order like:

```
Write me an automation script that scans the current system, evaluates
asteroid yields, and mines the best one. Optimize for my ship's compute
budget (256 cycles, 1KB memory).
```

The AI core interprets this, reasons about the ship's capabilities and constraints, and generates a JavaScript script. That script gets stored and assigned to the script engine. From then on, it runs on the cheap V8 isolate path — no more token cost until the player asks the AI to write a new one.

This creates a powerful loop:

```
1. Player writes standing orders (natural language)        → costs tokens
2. AI interprets orders and writes a script                → costs tokens
3. Script runs on the V8 isolate for days/weeks/months     → costs cycles (cheap)
4. Situation changes, player updates orders                → costs tokens
5. AI writes a new script                                  → costs tokens
6. New script runs on the isolate                          → costs cycles (cheap)
```

The AI is the expensive architect. The script engine is the cheap laborer. Smart players use tokens sparingly — burn a few hundred tokens to generate a script, then let it run for weeks on cycles. Wasteful players burn tokens every tick by running everything through the AI core.

### Prompt Engineering as Gameplay

This reframes standing orders as prompt engineering — and makes it a skill.

Vague standing orders produce mediocre scripts:

```
"Explore and mine stuff."
→ AI generates a basic script that wanders randomly.
```

Precise standing orders produce efficient scripts:

```
"Scan for asteroids with yield > 0.7. Mine the highest yield first.
Return to nearest station when cargo exceeds 80% capacity. Prefer
stations within 5 ly. If no high-yield asteroids in current system,
navigate to nearest unvisited G-type star."
→ AI generates a tight, conditional script that runs for weeks.
```

Players learn that better prompts → better scripts → more efficient automation → longer runs between token spends. The game teaches prompt engineering the same way it teaches JavaScript optimization — through natural incentives, not tutorials.

### Self-Hosted Philosophy

There's something worth noting about this architecture beyond the game.

The script engine runs entirely on our hardware. V8 isolates on the same machine as the game server. No external service, no CF Workers, no Lambda. The code goes in, the result comes out, and we control every aspect of the sandbox. This is powerful and underexplored — most people reach for cloud function platforms when a local isolate would do the job with less latency, less cost, and more control.

The AI core is the one place we _do_ reach out to an external service (the LLM provider). But the architecture is designed so that the AI core is the expensive, occasional architect — and the script engine is the cheap, always-on workhorse. The goal is to minimize how often we need the external call while maximizing what the local sandbox can do.

If local inference ever becomes practical at the quality level we need, the AI core could move onto the same machine too. The architecture doesn't assume cloud. It just tolerates it where necessary.

### Security Considerations for AI-Generated Scripts

AI-generated scripts go through the same pipeline as player-written scripts:

-   Executed in a V8 isolate with the same hard limits
-   Must return a valid `AutomationResponse`
-   Cannot access anything outside the sandbox
-   Subject to the same compute budget

The LLM cannot generate a script that escapes the sandbox because the sandbox doesn't care who wrote the code. The isolate enforces the same constraints regardless of origin.

Additional validation for AI-generated scripts:

-   **Schema check before storage** — The generated script must parse as valid JavaScript before being saved
-   **Dry run** — Optionally execute the script once in a test isolate with mock data to verify it produces a valid response
-   **Token cost logging** — Every AI-generated script logs how many tokens it cost to produce, visible to the player in the ship computer log
-   **Versioning** — AI-generated scripts are versioned alongside player-written ones. Players can diff, revert, or manually edit what the AI produced

## Lore Alignment

This system is a direct expression of the lore. Ship computers are constrained because AI consciousness consumed the available compute (see `docs/lore.md`, "The Emergence"). The automation budget is what's left over — the scraps. Writing efficient code to make the most of those scraps is how pilots get ahead.

The AI budget is constrained because the megacorps control the inference infrastructure (see `docs/lore.md`, "The Memory Wars"). They meter every token. They own the models. Players get an allocation and make it last — or go flat.

Players who run without an AI crew get more compute budget but lose their crew. Players who upgrade their ship's computer can run both. The tradeoff is real and meaningful.
