---
name: helm-bench
description: Use when the user wants to run or interpret Helm benchmark commands, compare benchmark reports, or summarize REST API performance regressions and improvements.
---

# Benchmark

Run REST API benchmarks against the Lando dev environment, save results, and compare with previous runs.

## Steps

1. Run the benchmark suite:

```bash
bun run bench
```

2. If there is a previous saved report, the output will include a comparison showing % change per endpoint. Regressions (slower) are shown in red, improvements (faster) in green.

3. To compare two specific reports:

```bash
bun run bench:compare [baseline.json] [current.json]
```

4. For machine-readable output:

```bash
bun run bench --format=json
```

## Interpreting Results

- **avg** — mean response time across all iterations
- **p95** — 95th percentile response time
- **ttfb** — time to first byte (when headers arrive)
- **size** — response body size in bytes

Reports are saved to `tmp/benchmarks/` with timestamp and git SHA in the filename.

When reporting results to the user, summarize:
- Which endpoints are fastest/slowest
- How embedded responses compare to non-embedded
- Any regressions compared to previous runs (highlight > 10% slower)
- Any notable improvements (highlight > 10% faster)
