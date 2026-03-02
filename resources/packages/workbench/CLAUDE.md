# Workbench

Design-time CLI for game balance analysis. Consumes `@helm/holodeck` for product catalog and ship simulation, `@helm/formulas` for calculations. All output is JSON to stdout.

```bash
bun run wb <command> [flags]
```

## Full Analysis

```bash
bun run wb analyse | jq '.categories[] | select(.category == "Baseline")'
```

Runs ~460 scenarios across 14 categories (baseline, tuning sweeps, power budget, component matrices, hull comparison, crossover mechanics, edge cases). This is the starting point — pipe through `jq` to explore.

## Diving Deeper

| Question | Command |
|----------|---------|
| How does one specific loadout perform? | `bun run wb report --hull=specter --core=epoch_r` |
| What's the difference between two builds? | `bun run wb compare --a.core=epoch_s --b.core=epoch_r` |
| Which component is best in a slot? | `bun run wb matrix --vary=core` (or `--vary=core,drive`) |
| Are any hull/component combos broken? | `bun run wb balance` (flags outliers >2σ) |
| Is detection/stealth balanced? | `bun run wb detection` (wolf × target × environment matrix) |
| Do DSP formulas serve design goals? | `bun run wb dsp-progress` (PASS/WARN/FAIL verdicts) |
| What are available components/hulls? | `bun run wb list products [--type=core]` / `bun run wb list hulls` |
| What does a holodeck ship look like? | `bun run wb ship --hull=pioneer --core=epoch_s` |
| How does power regen after consumption? | `bun run wb timeline --steps='[{"t":0,"action":"consumePower","amount":50},{"t":3600,"action":"resolve"}]'` |
| How does shield priority affect regen? | `bun run wb timeline --steps='[{"t":0,"action":"setShieldPriority","priority":2.0},{"t":3600,"action":"resolve"}]'` |
| What happens when a ship jumps? | `bun run wb action --action=jump --distance=5 --target-node=42` |
| What happens when a ship scans? | `bun run wb action --action=scan_route --distance=3 --target-node=10` |
| How does the exploration loop work? | `bun run wb scenario data/scenarios/scan-and-jump.json` |
| How does a combat scenario play out? | `bun run wb scenario data/scenarios/wolf-vs-miner-phaser.json` |
| How does a sequence of actions play out? | `bun run wb scenario data/scenarios/jump-chain.json` |

## Tuning Flags

Work on `report`, `compare`, `matrix`:

| Flag | Affects |
|------|---------|
| `--throttle=1.0` | Jump speed/cost (0.5=limp/free, 2.0=fast/expensive) |
| `--effort=1.0` | Scan duration/chance |
| `--priority=1.0` | Shield regen/draw |
| `--pilot.scanning=1.0` | Pilot scan skill multiplier (1.0→1.25) |
| `--pilot.jumping=1.0` | Pilot jump skill multiplier (1.0→1.25) |

## Key Metrics

- **perfRatio** — Core/drive balance, capped at 1.0. Below 1.0 = underpowered.
- **strain** — Distance/comfort ratio. Above 1.0 = exponential cost growth.
- **coreLife** — Finite. Cores degrade with jumps.
- **cargo** — Negative = loadout overflows hull (known issue: not flagged).
- **outliers** (in `balance`) — Values >2σ from mean. Potential balance problems.

## Navigation Graph

All commands load the star catalog NavGraph (275 systems within 10ly of Sol). Scans discover edges via deterministic waypoint generation, jumps require a discovered edge.

Scenarios accept an optional `masterSeed` field (defaults to `'helm'`). The NavGraph is always created and wired into the engine.
