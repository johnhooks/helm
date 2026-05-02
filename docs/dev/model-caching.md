# Model Caching with wp_cache

How we use `wp_cache` as an identity map for repository queries, and why we cache raw rows instead of model objects.

## Background

WordPress provides `wp_cache_get()` / `wp_cache_set()` as a per-request object cache. By default it's an in-memory PHP array that lives for the duration of the request. When a persistent object cache backend is active (Redis, Memcached), values are serialized with PHP's `serialize()` and stored across requests.

WordPress core uses this pattern extensively. For example, `_prime_post_caches()` batches post IDs, queries the missing ones, and stores each row in the `'posts'` cache group. Subsequent `get_post($id)` calls return from cache instead of hitting the database.

We follow the same pattern for our custom tables.

## The Serialization Problem

Our models extend StellarWP's `Model` base class. Internally, a Model instance holds:

-   `ModelPropertyCollection` — contains `ModelPropertyDefinition` objects with `castWith()` closures
-   `ModelRelationshipCollection` — contains relationship loaders bound as closures

PHP cannot serialize closures. With the default in-memory cache this is invisible (no serialization occurs), but with a persistent backend, `wp_cache_set($id, $product)` would fatal:

```
Serialization of 'Closure' is not allowed
```

This is a landmine — everything works in development (no persistent cache), then breaks in production (Redis/Memcached).

## The Pattern: Cache Rows, Hydrate on Read

Cache the raw database row (a plain `array<string, mixed>` of scalars) and hydrate into a model on every read. This is safe with any cache backend.

```php
private const CACHE_GROUP = 'helm_products';

public function find(int $id): ?Product
{
    /** @var array<string, mixed>|false $cached */
    $cached = wp_cache_get($id, self::CACHE_GROUP);

    if (is_array($cached)) {
        return $this->hydrate($cached);
    }

    // ... query DB ...

    wp_cache_set($id, $row, self::CACHE_GROUP);

    return $this->hydrate($row);
}
```

The cache stores `$row` (the associative array from `$wpdb->get_row()`), never the `Product` model. Hydration happens on every access, including cache hits.

### Hydration cost

Trivial. The `castWith()` callbacks are lightweight type coercions (`(int)`, `(float)`, `DateTimeImmutable::createFromFormat`). On a cache hit where the values are already the correct string representations, this is negligible compared to a database round-trip.

## Batch Priming

For endpoints that return multiple items each referencing a product (e.g. ship systems with fitted components), we batch-prime the cache upfront using `_get_non_cached_ids()`:

```php
public function findByIds(array $ids): array
{
    $uncachedIds = _get_non_cached_ids($ids, self::CACHE_GROUP);

    // Collect already-cached rows...

    if ($uncachedIds !== []) {
        // Single query for all missing IDs
        // Store each row in cache
    }

    return $products;
}
```

`_get_non_cached_ids()` is a WordPress core function that checks which IDs aren't yet in the given cache group. Only missing IDs are queried. This turns N individual queries (one per embed resolution) into 1 batch query.

### Conditional priming

Only prime when embeds are actually requested. Mirror the logic from `WP_REST_Server::embed_links()`:

```php
$embed = $request->get_param('_embed');

if ($embed !== null && (! is_array($embed) || in_array($linkRel, $embed, true))) {
    $this->productRepository->findByIds($productIds);
}
```

-   `?_embed` (no value) — `$embed` is a string, not an array — prime everything
-   `?_embed[]=helm:product` — `$embed` is `['helm:product']` — prime only if our rel matches
-   No `_embed` param — `$embed` is `null` — skip priming entirely

## Cache Groups

Each repository that implements caching uses its own cache group:

| Repository          | Cache Group     | Key        |
| ------------------- | --------------- | ---------- |
| `ProductRepository` | `helm_products` | Product ID |

No TTL is set. Products are seeded/static data, so entries live for the request duration (in-memory) or until evicted (persistent backend).

## Invalidation

Products don't need invalidation — they're seeded/static data that never changes at runtime. But mutable entities cached with this pattern will.

### Single entry

Delete a specific cache entry after a write:

```php
public function update(int $id, array $data): void
{
    // ... UPDATE query ...

    wp_cache_delete($id, self::CACHE_GROUP);
}
```

Delete, don't re-set. The next `find()` call will query the DB and repopulate the cache with the fresh row. Re-setting immediately after a write risks caching stale data if the DB applies triggers or defaults.

### Entire group

Flush all entries in a cache group:

```php
wp_cache_flush_group('helm_products');
```

`wp_cache_flush_group()` was added in WordPress 6.1. Use this for bulk operations like re-seeding an entire table. Note that with the default in-memory backend, this is effectively a no-op since the cache doesn't survive the request anyway — it matters when a persistent backend is active.

### When to invalidate

Invalidate on any write path that changes the cached row:

-   `insert()` — not strictly necessary (the ID is new, so no stale entry exists), but invalidate if the insert replaces a soft-deleted record or uses `ON DUPLICATE KEY UPDATE`
-   `update()` — always invalidate
-   `delete()` — always invalidate

Don't invalidate on read paths. If a `find()` returns stale data from a persistent cache, the problem is a missing invalidation on the write side, not a cache bug on the read side.

### In-memory vs persistent

With the default in-memory backend, invalidation only matters within a single request (e.g. insert then immediately read back). With Redis/Memcached, stale entries persist across requests, so write-path invalidation is critical.

## Rules

1. **Never cache model objects** — they contain closures via StellarWP's property system and cannot survive `serialize()`
2. **Cache the raw DB row** — plain associative arrays are safe with any backend
3. **Hydrate on every read** — the cost is negligible compared to the DB query saved
4. **Use `_get_non_cached_ids()`** — WordPress core's helper for finding uncached IDs in a group
5. **Prime conditionally** — only batch-load when the data will actually be used (e.g. `_embed` is present)
