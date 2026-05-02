---
status: draft
area: navigation
priority: p1
---

# Fix user edge totals

## Problem

The `/helm/v1/edges` endpoint reports `X-WP-Total` as the number of rows returned when the request uses `include`. Targeted scan reconciliation uses that header as the user's global edge count and stores it in datacore freshness metadata.

After a scan discovers a small number of edges, the local cache can record the targeted result count instead of the user's full discovered edge count. The next freshness check then sees a false mismatch and performs an unnecessary full edge refresh.

## Proposed solution

Make edge freshness headers describe the user's full discovered edge collection, even when the response body is filtered by `include`. `X-WP-Total` should reflect all edges discovered by the current user, and `X-Helm-Edge-Last-Discovered` should continue to describe the latest discovery across that full collection.

Preserve the filtered response body and authorization behavior for `include` requests. Add coverage that a targeted edge request returns only the requested edges while still reporting the full user-edge total, then keep the targeted datacore sync using those headers as global freshness metadata.
