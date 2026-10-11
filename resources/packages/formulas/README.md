# @helm/formulas

Canonical game math for Helm ship systems. Every formula that computes ship behavior lives here.

## Role

This package contains both production calculations and experimental holodeck/DSP mechanics. Do not assume every exported formula is implemented by the PHP engine.

The accumulated-work route scan calculator in `src/scan/route-stats-calculator.ts` is used by the live frontend and verified against PHP `ScanRoute\Rules` with shared fixtures. The older functions in `scan.ts` describe the separate holodeck scan model. `system-readouts.ts` computes live system readouts using the PHP system equations.

For production calculations, PHP and TypeScript must produce identical outputs for identical inputs. Shared fixture tests define that contract.

## Design

Every export is a pure, deterministic function. No state, no side effects, no I/O. Given the same inputs, always the same output.

## Usage

Import individual functions:

```typescript
import { strainFactor, jumpComfortRange, scanPowerCost } from '@helm/formulas';

const strain = strainFactor(distance, comfortRange);
```

Functions compose but don't depend on each other, except `scan.ts` imports `strainFactor` from `jump.ts` — strain is a shared mechanic.

## Modules

| Module   | Exports                                                                             |
| -------- | ----------------------------------------------------------------------------------- |
| `power`  | `coreOutput`, `regenRate`, `perfRatio`                                              |
| `jump`   | `strainFactor`, `jumpComfortRange`, `jumpDuration`, `jumpCoreCost`, `jumpPowerCost` |
| `scan`   | `scanComfortRange`, `scanPowerCost`, `scanDuration`, `scanSuccessChance`            |
| `shield` | `shieldRegenRate`, `shieldDraw`, `shieldTimeToFull`                                 |
| `nav`    | `discoveryProbability`                                                              |
| `types`  | `Constants`, `ActionTuning`, `DEFAULT_CONSTANTS`, `DEFAULT_TUNING`                  |

## Testing

Each formula file has a co-located test file. Tests use fixture data, not live products. Run with `bun run test` from root.

## Future

DSP/detection formulas (SNR, integration gain, matched filtering) will be added here as the scanning engine is designed. Stellar effect stacking formulas will follow.

## Not here

Report formatting, sample data generation, CLI tooling, UI — those belong in the workbench or other consumers.
