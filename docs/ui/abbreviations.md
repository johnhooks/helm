# LCARS abbreviations

Use this vocabulary for compact readout labels and units. Keep ordinary prose,
errors, help text, and accessible labels readable: “Estimated time to arrival”
rather than “ETA” when an explanation is needed. These are Helm display conventions;
API keys and stored values do not change to match them.

## Units

| Display | Meaning | Example |
| --- | --- | --- |
| SEC | Seconds | 30 SEC |
| MIN | Minutes | 7 MIN |
| HR | Hours | 1.2 HR |
| D | Days | 2.5 D |
| MJ | Stored power or power consumed | 1.69 MJ |
| MJ/HR | Power consumption or recharge per hour | 13.0 MJ/HR |
| LY | Light-years | 3.6 LY |
| LY/D | Travel speed in light-years per day | 5.0 LY/D |
| % | Percentage | 8.3% |
| × | Multiplier | 1.3× |

Use SEC, MIN, HR, and D consistently in readouts; avoid mixing H, HRS, HOURS,
and HR. Countdown components may retain their existing compact time formatting
and clock notation (such as 00:00); this reference does not require replacing
those formats with readout units.

## Compact labels

| Display | Meaning |
| --- | --- |
| PWR | Power |
| CYC | Cycle |
| PWR/CYC | Power consumed per cycle |
| DST | Distance |
| DUR | Duration |
| REM | Remaining |
| MAX | Maximum |
| SYS | Systems |
| ENG | Engineering |
| NAV | Navigation |
| SNSR | Sensors |
| ORIG | Origin |
| DEST | Destination |
| ETA | Estimated time of arrival |

Use compact labels where space calls for them, not as a blanket replacement for
clear short words. Keep WORK, CHANCE, RANGE, SPEED, and PEAK IN spelled out.
“Peak in” describes expected time to peak scan effectiveness, not arrival or a
guaranteed discovery; do not label it ETA.

## Readout formatting

- Put units in the component's `unit` prop, separate from its value.
- Example: Peak in uses `value="~1.2"` and `unit="HR"`.
- Power values use at least one and at most two decimal places: 1.0, 1.3, 1.34.
- Round for display only. Keep full precision in calculations and charging.
- Percentage readouts use one decimal place. Percent signs may stay with the
  value when that is the established component pattern.
- Keep accessible progress labels descriptive even when visible labels are short.
- Add new abbreviations here before introducing competing spellings in components.
