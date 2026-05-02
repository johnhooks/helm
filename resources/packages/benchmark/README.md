# @helm/benchmark

REST API benchmarking tools for Helm. Runs against the Lando dev environment.

## Requirements

-   Lando running with the Helm site (`lando start`)
-   Origin initialized and stars seeded (`lando wp helm status`)

## Usage

```bash
# Run benchmarks (20 iterations, human-readable output)
bun run bench

# Custom iteration count
bun run bench 50

# JSON output to stdout
bun run bench --format=json

# JSON output to file
bun run bench --format=json --output=path/to/report.json

# Compare last two saved reports
bun run bench:compare

# Compare a specific report against the latest
bun run bench:compare path/to/baseline.json

# Compare two specific reports
bun run bench:compare old.json new.json
```

## Reports

Each run in human mode saves a JSON report to `results/` with the timestamp and git SHA in the filename. Subsequent runs auto-compare against the most recent saved report.

Reports contain git metadata (SHA, branch), timestamps, and full stats (min/avg/max/p95/ttfb/size) for every benchmark.

## Output

Human-readable output and diagnostics go to stderr. JSON (`--format=json`) goes to stdout, so you can pipe it cleanly:

```bash
bun run bench --format=json > report.json
bun run bench --format=json | jq '.groups[].results[].label'
```

## Adding Benchmarks

Create a new file in `benchmarks/`. Each benchmark is a standalone Bun script:

```ts
import { setup, bench, header } from '../src';
import { buildReport, saveReport } from '../src/lib/report';

const { auth, apiBase } = await setup();

// Build URLs, run benchmarks, save reports...
```

Key exports from `src/`:

-   `setup()` — resolves API base URL, ensures auth, checks readiness
-   `bench({ label, url, iterations, auth, validate? })` — runs N iterations, returns `BenchResult | null`
-   `header(title)` — prints a section header
-   `formatResult(r)` / `formatComparison(r, baseline)` — format result lines
-   `buildReport(groups)` — creates a `BenchReport` with git metadata
-   `saveReport(report)` — saves to `results/`, returns filepath
-   `loadLatestReport(beforeTimestamp?)` — loads most recent saved report
-   `findResult(report, groupName, label)` — find a result for comparison
