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
| How does a combat matchup play out? | `bun run wb combat --attacker=striker --weapon=phaser_array --defender=pioneer` |
| What are available components/hulls? | `bun run wb list products [--type=core]` / `bun run wb list hulls` |
| What does a holodeck ship look like? | `bun run wb ship --hull=pioneer --core=epoch_s` |
| How does power regen after consumption? | `bun run wb timeline --steps='[{"t":0,"action":"consumePower","amount":50},{"t":3600,"action":"resolve"}]'` |

## Tuning Flags

Work on `report`, `compare`, `matrix`:

| Flag | Affects |
|------|---------|
| `--throttle=1.0` | Jump speed/cost (0.5=limp/free, 2.0=fast/expensive) |
| `--effort=1.0` | Scan duration/chance |
| `--priority=1.0` | Shield regen/draw |

## Key Metrics

- **perfRatio** — Core/drive balance, capped at 1.0. Below 1.0 = underpowered.
- **strain** — Distance/comfort ratio. Above 1.0 = exponential cost growth.
- **coreLife** — Finite. Cores degrade with jumps.
- **cargo** — Negative = loadout overflows hull (known issue: not flagged).
- **outliers** (in `balance`) — Values >2σ from mean. Potential balance problems.
