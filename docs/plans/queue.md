# Queue Architecture

A scalable job queue system for WordPress, starting simple and designed to grow.

## Overview

The queue system handles deferred work - jobs that need to execute later or asynchronously. For Helm, this primarily means ship actions (jump, scan, mine) that take real game time to complete.

### Design Goals

1. **Start simple** - Database queue with AS-triggered workers
2. **Scale horizontally** - Multiple concurrent workers
3. **Swap implementations** - Interfaces allow Redis, external workers later
4. **WordPress-native** - Use WP APIs where sensible, escape when needed

### Two Orthogonal Concerns

**Queue Storage** - Where jobs live, how they're claimed
- Database with `SELECT FOR UPDATE SKIP LOCKED`
- Redis with `BLPOP` (future)

**Worker Dispatch** - How workers are spawned and run
- Action Scheduler loopbacks (HTTP requests to self)
- Persistent CLI workers (future)
- External workers - Lambda, CF Workers (future)

These combine independently. You can swap the queue without changing workers, or vice versa.

---

## Interfaces

### ActionQueue

Handles job storage and claiming. Doesn't know or care how workers are spawned.

```php
interface ActionQueue
{
    /**
     * Claim a batch of ready actions for processing.
     * Returns action IDs that are now locked to this worker.
     *
     * @return int[]
     */
    public function claim(int $limit): array;

    /**
     * Release an action back to the queue for retry.
     * Clears the processing lock and sets new deferred time.
     */
    public function release(int $actionId, \DateTimeImmutable $retryAt): void;

    /**
     * Mark an action as successfully completed.
     */
    public function complete(int $actionId, array $result): void;

    /**
     * Mark an action as permanently failed.
     */
    public function fail(int $actionId, array $result): void;

    /**
     * Count actions ready for processing.
     */
    public function countReady(): int;
}
```

### WorkerDispatcher

Handles spawning workers. Doesn't know or care where jobs come from.

```php
interface WorkerDispatcher
{
    /**
     * Dispatch workers to process the queue.
     *
     * @param int $count Number of workers to spawn
     */
    public function dispatch(int $count): void;
}
```

### ActionProcessor

The actual job processing logic. Receives claimed actions, processes them.

```php
interface ActionProcessor
{
    /**
     * Process a single action.
     * Handles loading the ship, running the finalizer, updating status.
     */
    public function process(int $actionId): void;
}
```

---

## Phase 1: Database + AS Loopbacks

The starting implementation. Good for hundreds of actions per minute.

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│ AS Recurring Action: helm_queue_orchestrator (every minute)     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Count pending actions                                       │
│  2. Calculate workers needed: min(ceil(pending/50), max_workers)│
│  3. Spawn N async AS actions (loopback HTTP requests)           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
         │
         │ as_enqueue_async_action('helm_queue_worker') × N
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ PHP-FPM Worker Pool                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ Worker #1    │ │ Worker #2    │ │ Worker #3    │            │
│  │              │ │              │ │              │            │
│  │ Claims 1-50  │ │ Claims 51-100│ │ Claims 101-150           │
│  │ (SKIP LOCKED)│ │ (SKIP LOCKED)│ │ (SKIP LOCKED)│            │
│  │              │ │              │ │              │            │
│  │ Processes... │ │ Processes... │ │ Processes... │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                 │
│  Each worker is a separate PHP-FPM process (true parallelism)   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### DatabaseActionQueue

Claims jobs using `SELECT FOR UPDATE SKIP LOCKED`:

```php
class DatabaseActionQueue implements ActionQueue
{
    private const PROCESSING_TIMEOUT = 300; // 5 minutes

    public function claim(int $limit): array
    {
        global $wpdb;
        $table = $wpdb->prefix . 'helm_ship_actions';
        $timeout = gmdate('Y-m-d H:i:s', time() - self::PROCESSING_TIMEOUT);
        $now = current_time('mysql', true);

        $wpdb->query('START TRANSACTION');

        $sql = $wpdb->prepare(
            "SELECT id FROM {$table}
            WHERE status = 'pending'
            AND (deferred_until IS NULL OR deferred_until <= %s)
            AND (processing_at IS NULL OR processing_at < %s)
            ORDER BY id ASC
            LIMIT %d
            FOR UPDATE SKIP LOCKED",
            $now,
            $timeout,
            $limit
        );

        $ids = $wpdb->get_col($sql);

        if (empty($ids)) {
            $wpdb->query('COMMIT');
            return [];
        }

        $idList = implode(',', array_map('intval', $ids));
        $wpdb->query($wpdb->prepare(
            "UPDATE {$table} SET processing_at = %s WHERE id IN ({$idList})",
            $now
        ));

        $wpdb->query('COMMIT');

        return array_map('intval', $ids);
    }

    // ... release(), complete(), fail() implementations
}
```

### ASLoopbackDispatcher

Spawns workers via Action Scheduler async actions:

```php
class ASLoopbackDispatcher implements WorkerDispatcher
{
    private const MAX_WORKERS = 4;
    private const BATCH_SIZE = 50;

    public function __construct(
        private ActionQueue $queue,
    ) {}

    public function dispatch(int $count): void
    {
        $count = min($count, self::MAX_WORKERS);

        for ($i = 0; $i < $count; $i++) {
            as_enqueue_async_action(
                'helm_queue_worker',
                [],
                'helm-queue'
            );
        }
    }

    /**
     * Calculate optimal worker count based on queue depth.
     */
    public function calculateWorkers(): int
    {
        $pending = $this->queue->countReady();

        if ($pending === 0) {
            return 0;
        }

        return min(
            (int) ceil($pending / self::BATCH_SIZE),
            self::MAX_WORKERS
        );
    }
}
```

### Orchestrator

Ties it together:

```php
// Registered as AS recurring action (every minute)
add_action('helm_queue_orchestrator', function () {
    $dispatcher = helm(ASLoopbackDispatcher::class);

    $workers = $dispatcher->calculateWorkers();

    if ($workers > 0) {
        $dispatcher->dispatch($workers);
    }
});

// Each worker processes a batch
add_action('helm_queue_worker', function () {
    $queue = helm(ActionQueue::class);
    $processor = helm(ActionProcessor::class);

    $actionIds = $queue->claim(limit: 50);

    foreach ($actionIds as $actionId) {
        $processor->process($actionId);
    }
});
```

### Why This Works

**True parallelism via HTTP loopbacks:**
- Each `as_enqueue_async_action()` triggers an HTTP request to the site
- Nginx/Apache spawns a new PHP-FPM worker for each request
- Workers run in separate processes, potentially on different CPU cores
- `SKIP LOCKED` ensures workers grab different rows without blocking

**Automatic scaling:**
- Orchestrator spawns workers based on queue depth
- Low load (10 actions): 1 worker
- High load (200 actions): 4 workers
- No workers when queue is empty

**Crash recovery:**
- `processing_at` timestamp acts as a lease
- If worker crashes, actions become available after timeout (5 minutes)
- Other workers will pick them up

---

## Phase 2: Persistent CLI Workers

More responsive processing with lower latency. Workers poll continuously instead of waiting for cron.

### How It Works

```bash
# Start workers (managed by Supervisor)
wp helm queue:work --workers=4

# Or run multiple single workers
wp helm queue:work &
wp helm queue:work &
wp helm queue:work &
wp helm queue:work &
```

```
┌─────────────────────────────────────────────────────────────────┐
│ Supervisor                                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ wp queue:work│ │ wp queue:work│ │ wp queue:work│            │
│  │              │ │              │ │              │            │
│  │ while(true)  │ │ while(true)  │ │ while(true)  │            │
│  │   claim()    │ │   claim()    │ │   claim()    │            │
│  │   process()  │ │   process()  │ │   process()  │            │
│  │   sleep(1)   │ │   sleep(1)   │ │   sleep(1)   │            │
│  │ end          │ │ end          │ │ end          │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                 │
│  Supervisor restarts workers if they crash                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### CLIWorkerDispatcher

For CLI workers, "dispatch" might just be a no-op (workers are already running) or could signal workers via a semaphore.

```php
class CLIWorkerDispatcher implements WorkerDispatcher
{
    public function dispatch(int $count): void
    {
        // Workers are already running, nothing to do
        // Or: signal workers via cache/semaphore to wake up
    }
}
```

### WP-CLI Command

```php
class QueueWorkCommand
{
    public function __invoke($args, $assoc_args): void
    {
        $queue = helm(ActionQueue::class);
        $processor = helm(ActionProcessor::class);

        $batchSize = (int) ($assoc_args['batch'] ?? 50);
        $sleep = (int) ($assoc_args['sleep'] ?? 1);
        $timeout = (int) ($assoc_args['timeout'] ?? 300);

        $started = time();

        WP_CLI::log("Worker started. Listening for actions...");

        while (true) {
            // Restart worker periodically to prevent memory leaks
            if (time() - $started > $timeout) {
                WP_CLI::log("Timeout reached, exiting for restart...");
                break;
            }

            $actionIds = $queue->claim($batchSize);

            if (empty($actionIds)) {
                sleep($sleep);
                continue;
            }

            foreach ($actionIds as $actionId) {
                $processor->process($actionId);
            }
        }
    }
}
```

### Supervisor Config

```ini
[program:helm-worker]
command=wp helm queue:work --path=/var/www/html
directory=/var/www/html
user=www-data
numprocs=4
process_name=%(program_name)s_%(process_num)02d
autostart=true
autorestart=true
startsecs=10
stopwaitsecs=30
stdout_logfile=/var/log/helm/worker_%(process_num)02d.log
stderr_logfile=/var/log/helm/worker_%(process_num)02d_error.log
```

### Benefits Over AS Loopbacks

| Aspect | AS Loopbacks | CLI Workers |
|--------|--------------|-------------|
| Latency | ~1-60 seconds (cron interval) | ~1 second (poll interval) |
| Overhead | HTTP request per batch | None (already running) |
| Memory | Fresh per request | Persistent (watch for leaks) |
| Management | Automatic | Requires Supervisor |
| Scaling | Limited by max workers | Add more processes |

---

## Phase 3: Redis Queue

Faster claiming, pub/sub for instant worker notification.

### RedisActionQueue

```php
class RedisActionQueue implements ActionQueue
{
    public function __construct(
        private \Redis $redis,
        private ActionRepository $repository, // Still need DB for full action data
    ) {}

    public function push(int $actionId, \DateTimeImmutable $availableAt): void
    {
        $score = $availableAt->getTimestamp();
        $this->redis->zAdd('helm:actions:pending', $score, $actionId);
    }

    public function claim(int $limit): array
    {
        $now = time();

        // Atomic: get and remove items with score <= now
        $lua = <<<'LUA'
            local items = redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', ARGV[1], 'LIMIT', 0, ARGV[2])
            if #items > 0 then
                redis.call('ZREM', KEYS[1], unpack(items))
                for i, id in ipairs(items) do
                    redis.call('HSET', KEYS[2], id, ARGV[3])
                end
            end
            return items
        LUA;

        $ids = $this->redis->eval(
            $lua,
            ['helm:actions:pending', 'helm:actions:processing', $now, $limit, time()],
            2
        );

        return array_map('intval', $ids);
    }

    public function release(int $actionId, \DateTimeImmutable $retryAt): void
    {
        $this->redis->hDel('helm:actions:processing', $actionId);
        $this->redis->zAdd('helm:actions:pending', $retryAt->getTimestamp(), $actionId);
    }

    // ... complete(), fail()
}
```

### Hybrid Approach

Redis for queue operations, database for action data:

```
┌─────────────────────────────────────────────────────────────────┐
│ Redis                                                           │
│ - helm:actions:pending (sorted set by deferred_until)           │
│ - helm:actions:processing (hash of actionId → claimed_at)       │
│ - helm:actions:notify (pub/sub channel)                         │
└─────────────────────────────────────────────────────────────────┘
         │
         │ Action IDs only
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Database                                                        │
│ - helm_ship_actions (full action data, params, results)         │
│ - Still partitioned for historical data                         │
└─────────────────────────────────────────────────────────────────┘
```

### Benefits

- **Faster claiming** - Redis operations are sub-millisecond
- **Pub/sub** - Workers can subscribe and wake instantly on new jobs
- **Atomic operations** - Lua scripts for complex claim logic
- **No table locking** - Database only for reads/writes, not contention

---

## Phase 4: External Workers

For massive scale or serverless architectures.

### Push to External Queue

```php
class SQSActionQueue implements ActionQueue
{
    public function push(int $actionId, \DateTimeImmutable $availableAt): void
    {
        $this->sqs->sendMessage([
            'QueueUrl' => $this->queueUrl,
            'MessageBody' => json_encode(['action_id' => $actionId]),
            'DelaySeconds' => max(0, $availableAt->getTimestamp() - time()),
        ]);
    }

    // claim() not used - external workers pull from SQS directly
}
```

### External Worker (Laravel/Node/CF Worker)

```php
// Laravel job that processes Helm actions
class ProcessHelmAction implements ShouldQueue
{
    public function __construct(
        public int $actionId,
        public string $helmApiUrl,
    ) {}

    public function handle(HttpClient $http): void
    {
        // Call back to WordPress to process
        $http->post("{$this->helmApiUrl}/wp-json/helm/v1/actions/{$this->actionId}/process", [
            'headers' => ['X-Worker-Secret' => config('helm.worker_secret')],
        ]);
    }
}
```

### WordPress as API

At this scale, WordPress becomes the API/database layer:

```php
// REST endpoint for external workers
register_rest_route('helm/v1', '/actions/(?P<id>\d+)/process', [
    'methods' => 'POST',
    'callback' => function ($request) {
        $processor = helm(ActionProcessor::class);
        $processor->process($request['id']);
        return new WP_REST_Response(['success' => true]);
    },
    'permission_callback' => fn($r) => $r->get_header('X-Worker-Secret') === HELM_WORKER_SECRET,
]);
```

---

## Comparison

| Phase | Queue | Workers | Throughput | Latency | Complexity |
|-------|-------|---------|------------|---------|------------|
| 1 | Database | AS Loopbacks | ~200/min | ~60s | Low |
| 2 | Database | CLI Workers | ~500/min | ~1s | Medium |
| 3 | Redis | CLI Workers | ~2000/min | ~100ms | Medium |
| 4 | SQS/RabbitMQ | Lambda/External | ~10000+/min | ~100ms | High |

---

## Implementation Roadmap

### Now (Phase 1)
- [ ] Define `ActionQueue` interface
- [ ] Implement `DatabaseActionQueue` with `SKIP LOCKED`
- [ ] Define `WorkerDispatcher` interface
- [ ] Implement `ASLoopbackDispatcher`
- [ ] Create orchestrator and worker AS hooks
- [ ] Wire up with ActionProcessor

### Growing Pains (Phase 2)
- [ ] Implement `wp helm queue:work` CLI command
- [ ] Create Supervisor config template
- [ ] Add `CLIWorkerDispatcher`
- [ ] Document deployment with process management

### Scale (Phase 3)
- [ ] Implement `RedisActionQueue`
- [ ] Add pub/sub for instant worker notification
- [ ] Hybrid: Redis queue + DB storage

### Massive Scale (Phase 4)
- [ ] Evaluate external queue (SQS, RabbitMQ)
- [ ] Build REST API for external workers
- [ ] Consider dedicated worker service (Laravel, Node)

---

## Table Partitioning

The actions table serves as both queue (pending) and archive (completed). At scale, this gets slow — millions of rows, large indexes, write contention.

### Strategy

Partition by day on `created_at`. Pending actions are always recent, so queries only scan recent partitions. Old partitions are dropped instantly (`DROP PARTITION` is O(1), unlike `DELETE`).

### MySQL/MariaDB Constraints

1. **Partition column must be in PRIMARY KEY** — use `PRIMARY KEY (created_at, id)`
2. **AUTO_INCREMENT needs a separate index** — add `INDEX (id)`
3. **Keep under 50 partitions** — performance degrades above this
4. **Always have a catchall partition** — `p_future VALUES LESS THAN MAXVALUE`

### Graceful Degradation

The `p_future` partition catches any records that don't fit in defined partitions. If maintenance fails:

| Gap | Impact |
|-----|--------|
| 1 day | Data lands in `p_future`, carved out when maintenance runs |
| 1 week | Week's data lumped together, still works |
| Forever | Works like a regular non-partitioned table |

Partitioning is an optimization, not a correctness requirement.

### Schema Management

WordPress's `dbDelta()` doesn't support partitioning syntax. The `helm_ship_actions` table would be managed separately:
- Created with raw SQL including `PARTITION BY RANGE`
- Future changes use version-based migrations (explicit `ALTER TABLE` statements)
- Separate schema version tracked in options

Other tables continue using `dbDelta()`.

### Maintenance Cron

Daily maintenance via `helm_maintain_action_partitions`:
1. `REORGANIZE PARTITION` splits `p_future` to create tomorrow's partition
2. `DROP PARTITION` removes partitions past retention (e.g., 30 days)

Both operations are O(1) regardless of row count.

---

## Database Requirements

Helm's queue system requires modern database features:

- **MySQL 8.0+** or **MariaDB 10.6+**
- **InnoDB** storage engine
- **`SELECT FOR UPDATE SKIP LOCKED`** - non-blocking concurrent claims
- **Table partitioning** - time-based partitioning for scale
- **JSON columns** - native JSON for params/results

MariaDB 10.6+ specifically required for `SKIP LOCKED` support.
