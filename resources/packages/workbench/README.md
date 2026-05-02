# Workbench

CLI tool for agent-driven gameplay analysis and formula validation.

Uses `@helm/formulas` to compute ship reports across loadouts, tuning, and component combinations. Not a product — it's a design workbench for validating formulas and testing game balance.

All output is JSON to stdout, designed for piping through `jq` or being consumed by agents.

## CLI

```bash
bun run wb list products           # all components
bun run wb list products --type=core  # just cores
bun run wb list hulls              # available hulls

bun run wb report                  # default loadout
bun run wb report --core=epoch_r   # swap one component

bun run wb compare --a.core=epoch_s --b.core=epoch_r   # side-by-side delta

bun run wb matrix --vary=core               # sweep all cores
bun run wb matrix --vary=core,drive          # sweep all core+drive combos

bun run wb analyse                 # run full analysis battery
```

## Defaults

Every slot has a default. If you omit a flag, the default fills in:

| Slot   | Default       |
| ------ | ------------- |
| hull   | `pioneer`     |
| core   | `epoch_s`     |
| drive  | `dr_505`      |
| sensor | `vrs_mk1`     |
| shield | `aegis_delta` |
| nav    | `nav_tier_3`  |
| tuning | all `1.0`     |

## Global Flags

These work on `report`, `compare`, and `matrix`:

| Flag                                | Description                                                    |
| ----------------------------------- | -------------------------------------------------------------- |
| `--throttle=1.0`                    | Jump throttle (0.5 = limp home / free, 2.0 = fast / expensive) |
| `--effort=1.0`                      | Scan effort (higher = longer but better chance past comfort)   |
| `--priority=1.0`                    | Shield priority (higher = faster regen, more draw)             |
| `--const.baseJumpSecondsPerLy=1800` | Override a formula constant                                    |

## Relationship to @helm/formulas

The workbench **consumes** `@helm/formulas` — it doesn't define formulas. If a formula needs changing, change it in the formulas package. The workbench just calls it.

## Development

```bash
# Run tests
cd resources/workbench && bun test
```
