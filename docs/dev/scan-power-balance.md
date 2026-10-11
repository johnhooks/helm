# Scan power balance — initial calibration

This report records the initial power-only implementation. Subsequent mode scaling multiplies cycle cost by mode output squared and divides duration by mode output. Normal-mode rows remain applicable; efficiency/overdrive results require the updated matrix.

122 configurations, 2,330 seeded trials using production PHP actions and detached memory repositories. No live ships changed. Reproduce with `lando wp eval-file bin/simulate-route-scans.php`.

Scan costs: economy 0.5 MJ/cycle, normal 1 MJ/cycle, fast 2 MJ/cycle. Jump departure costs 5 MJ/ly × drive consumption. Recharge runs throughout scanning; scanning consumes no core life.

## Core and reserve stress tests

VRS Mk1, navigation tier 3, normal power mode, 2.416 ly scan and prospective jump, standard drive, 20 trials per row. Times include failed attempts. Wait is the longest recharge wait before the prospective jump.

| Core | Scan | Start MJ | Complete | Median hours | Mean remaining MJ | Max wait minutes |
|---|---|---:|---:|---:|---:|---:|
| epoch_e | economy | 25 | 20/20 | 8.00 | 40.6 | 0.0 |
| epoch_e | economy | 100 | 20/20 | 8.00 | 99.5 | 0.0 |
| epoch_e | normal | 25 | 3/20 | 3.58 | 1.6 | 139.1 |
| epoch_e | normal | 100 | 20/20 | 4.00 | 72.2 | 0.0 |
| epoch_e | fast | 25 | 0/20 | 0.58 | 1.9 | 122.0 |
| epoch_e | fast | 100 | 18/20 | 2.00 | 16.7 | 127.8 |
| epoch_s | economy | 25 | 20/20 | 7.83 | 78.1 | 0.0 |
| epoch_s | economy | 100 | 20/20 | 7.83 | 99.5 | 0.0 |
| epoch_s | normal | 25 | 20/20 | 3.92 | 17.4 | 0.0 |
| epoch_s | normal | 100 | 20/20 | 3.92 | 91.5 | 0.0 |
| epoch_s | fast | 25 | 0/20 | 0.67 | 1.7 | 62.5 |
| epoch_s | fast | 100 | 20/20 | 1.96 | 27.5 | 45.3 |
| epoch_r | economy | 25 | 20/20 | 7.83 | 99.2 | 0.0 |
| epoch_r | economy | 100 | 20/20 | 7.83 | 99.5 | 0.0 |
| epoch_r | normal | 25 | 20/20 | 3.92 | 55.1 | 0.0 |
| epoch_r | normal | 100 | 20/20 | 3.92 | 99.0 | 0.0 |
| epoch_r | fast | 25 | 0/20 | 0.92 | 1.3 | 32.3 |
| epoch_r | fast | 100 | 20/20 | 1.96 | 46.4 | 0.0 |

## Scanner, navigation, and distance matrix

Standard core, full power, normal power mode, 20 trials per row. Completion distinguishes reaching the target from failures and policy stops.

| Scanner | Nav tier | Distance ly | Scan | Complete | Median hours | P90 hours | Mean remaining MJ |
|---|---:|---:|---|---:|---:|---:|---:|
| dsc_mk1 | 1 | 0.5 | normal | 20/20 | 3.62 | 4.20 | 99.0 |
| dsc_mk1 | 1 | 0.5 | fast | 20/20 | 1.81 | 2.10 | 56.5 |
| dsc_mk1 | 1 | 2.416 | normal | 20/20 | 17.27 | 18.43 | 99.0 |
| dsc_mk1 | 1 | 2.416 | fast | 0/20 | 4.14 | 4.14 | 0.8 |
| dsc_mk1 | 1 | 6.5 | normal | 20/20 | 43.75 | 49.82 | 99.0 |
| dsc_mk1 | 1 | 6.5 | fast | 0/20 | 4.14 | 4.14 | 0.8 |
| dsc_mk1 | 3 | 0.5 | normal | 20/20 | 1.33 | 1.50 | 96.6 |
| dsc_mk1 | 3 | 0.5 | fast | 20/20 | 0.67 | 0.75 | 75.3 |
| dsc_mk1 | 3 | 2.416 | normal | 20/20 | 6.42 | 7.08 | 86.4 |
| dsc_mk1 | 3 | 2.416 | fast | 1/20 | 2.63 | 2.63 | 2.3 |
| dsc_mk1 | 3 | 6.5 | normal | 20/20 | 16.42 | 18.50 | 66.4 |
| dsc_mk1 | 3 | 6.5 | fast | 0/20 | 2.63 | 2.63 | 1.8 |
| dsc_mk1 | 5 | 0.5 | normal | 20/20 | 0.64 | 0.76 | 94.8 |
| dsc_mk1 | 5 | 0.5 | fast | 20/20 | 0.32 | 0.38 | 80.6 |
| dsc_mk1 | 5 | 2.416 | normal | 20/20 | 3.09 | 3.44 | 77.2 |
| dsc_mk1 | 5 | 2.416 | fast | 16/20 | 1.55 | 1.72 | 9.6 |
| dsc_mk1 | 5 | 6.5 | normal | 20/20 | 8.28 | 8.81 | 41.8 |
| dsc_mk1 | 5 | 6.5 | fast | 0/20 | 1.72 | 1.72 | 0.9 |
| vrs_mk1 | 1 | 0.5 | normal | 20/20 | 3.62 | 4.20 | 99.0 |
| vrs_mk1 | 1 | 0.5 | fast | 20/20 | 1.81 | 2.10 | 56.7 |
| vrs_mk1 | 1 | 2.416 | normal | 20/20 | 17.27 | 18.43 | 99.0 |
| vrs_mk1 | 1 | 2.416 | fast | 0/20 | 4.14 | 4.14 | 0.8 |
| vrs_mk1 | 1 | 6.5 | normal | 0/20 | — | — | — |
| vrs_mk1 | 1 | 6.5 | fast | 0/20 | — | — | — |
| vrs_mk1 | 3 | 0.5 | normal | 20/20 | 1.33 | 1.50 | 96.6 |
| vrs_mk1 | 3 | 0.5 | fast | 20/20 | 0.67 | 0.75 | 75.3 |
| vrs_mk1 | 3 | 2.416 | normal | 20/20 | 6.42 | 7.25 | 86.1 |
| vrs_mk1 | 3 | 2.416 | fast | 1/20 | 2.63 | 2.63 | 2.3 |
| vrs_mk1 | 3 | 6.5 | normal | 0/20 | — | — | — |
| vrs_mk1 | 3 | 6.5 | fast | 0/20 | — | — | — |
| vrs_mk1 | 5 | 0.5 | normal | 20/20 | 0.64 | 0.76 | 94.8 |
| vrs_mk1 | 5 | 0.5 | fast | 20/20 | 0.32 | 0.38 | 80.6 |
| vrs_mk1 | 5 | 2.416 | normal | 20/20 | 3.15 | 3.50 | 76.9 |
| vrs_mk1 | 5 | 2.416 | fast | 15/20 | 1.57 | 1.72 | 8.9 |
| vrs_mk1 | 5 | 6.5 | normal | 0/20 | — | — | — |
| vrs_mk1 | 5 | 6.5 | fast | 0/20 | — | — | — |
| acu_mk1 | 1 | 0.5 | normal | 20/20 | 3.62 | 4.20 | 99.0 |
| acu_mk1 | 1 | 0.5 | fast | 20/20 | 1.81 | 2.10 | 56.7 |
| acu_mk1 | 1 | 2.416 | normal | 20/20 | 17.73 | 19.60 | 99.0 |
| acu_mk1 | 1 | 2.416 | fast | 0/20 | 4.14 | 4.14 | 0.8 |
| acu_mk1 | 1 | 6.5 | normal | 0/20 | — | — | — |
| acu_mk1 | 1 | 6.5 | fast | 0/20 | — | — | — |
| acu_mk1 | 3 | 0.5 | normal | 20/20 | 1.33 | 1.50 | 96.6 |
| acu_mk1 | 3 | 0.5 | fast | 20/20 | 0.67 | 0.75 | 75.3 |
| acu_mk1 | 3 | 2.416 | normal | 20/20 | 6.67 | 7.50 | 85.8 |
| acu_mk1 | 3 | 2.416 | fast | 1/20 | 2.63 | 2.63 | 2.3 |
| acu_mk1 | 3 | 6.5 | normal | 0/20 | — | — | — |
| acu_mk1 | 3 | 6.5 | fast | 0/20 | — | — | — |
| acu_mk1 | 5 | 0.5 | normal | 20/20 | 0.64 | 0.76 | 94.8 |
| acu_mk1 | 5 | 0.5 | fast | 20/20 | 0.32 | 0.38 | 80.6 |
| acu_mk1 | 5 | 2.416 | normal | 20/20 | 3.21 | 3.62 | 76.5 |
| acu_mk1 | 5 | 2.416 | fast | 14/20 | 1.60 | 1.72 | 7.7 |
| acu_mk1 | 5 | 6.5 | normal | 0/20 | — | — | — |
| acu_mk1 | 5 | 6.5 | fast | 0/20 | — | — | — |

## Interpretation

Economy scanning is sustainable with these cores and allows recharge. Normal scans suit a charged standard core; weaker cores can exhaust a low starting reserve. Fast scanning trades reserve for time, and at 25 MJ all three cores exhausted their power in these stress trials. A stronger core improves that margin without eliminating the cost of aggressive scanning.

Retain these as initial values for playtesting. Before exposing intensity controls, show expected power draw against recharge and the reserve required for the chosen jump. The current work bar and peak estimate describe the next discovery attempt, not a guaranteed arrival time.

Jump wait uses production range and cost formulas; it is a forecast, not an executed jump per matrix trial. Integration tests separately exercise scan exhaustion, rejected departure, recharge, successful travel, and arrival without sufficient power for another leg. Twenty trials per configuration can expose broad differences but do not establish reliable rare-event rates.

## Power-mode scaling follow-up

The updated 122-configuration, 2,330-trial matrix applies mode output to cycle speed and its square to cycle cost. The following normal-intensity, 2.416 ly VRS Mk1 scans started fully charged at navigation tier 3; each row uses 10 trials with the same seed.

| Core | Mode | Complete | Median hours | Mean remaining MJ |
|---|---|---:|---:|---:|
| epoch_e | efficiency | 10/10 | 9.65 | 83.7 |
| epoch_e | normal | 10/10 | 6.42 | 52.1 |
| epoch_e | overdrive | 5/10 | 4.94 | 3.7 |
| epoch_s | efficiency | 10/10 | 9.65 | 99.5 |
| epoch_s | normal | 10/10 | 6.42 | 85.5 |
| epoch_s | overdrive | 10/10 | 4.94 | 32.1 |
| epoch_r | efficiency | 10/10 | 9.65 | 99.5 |
| epoch_r | normal | 10/10 | 6.42 | 99.0 |
| epoch_r | overdrive | 10/10 | 4.94 | 96.4 |

Overdrive drains the standard core reserve despite its higher recharge; half the weak-core trials exhausted power. The strongest core sustained this particular scan. These are balancing observations, not guaranteed completion rates.
