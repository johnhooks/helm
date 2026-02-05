# Real-Time Communication

How the game pushes events to connected players. Two approaches under exploration.

## The Problem

Helm is async — actions take hours. But players with the game open in a browser want to know when things happen without refreshing. "Your scan completed." "Your platform was raided." "An Other ship entered your system."

Two mechanisms, each with tradeoffs.

## Option 1: WebSockets

A separate WebSocket server that WordPress pushes events to, and connected browsers receive them instantly.

### Architecture

```
WordPress (Helm)                 WebSocket Server            Browser
     │                               │                         │
     │  HTTP POST (event)            │                         │
     ├──────────────────────────────►│                         │
     │                               │  WebSocket push         │
     │                               ├────────────────────────►│
     │                               │                         │
     │  REST auth (private channels) │                         │
     │◄─────────────────────────────────────────────────────────┤
     │  auth token                   │                         │
     ├─────────────────────────────────────────────────────────►│
     │                               │  subscribe (private)    │
     │                               │◄────────────────────────┤
```

### How It Works

**Server side (PHP):**
```php
// Action completes — broadcast to the ship's owner
helm_broadcast(
    "private-user-{$ship->ownerId}",
    'ActionCompleted',
    [
        'ship_id' => $ship->postId,
        'action' => 'scan',
        'result' => $scanResult->toArray(),
    ]
);
```

**Client side (JavaScript):**
```javascript
// Listen for your ship's events
ws.subscribe(`user.${userId}`)
    .on('ActionCompleted', (e) => {
        showNotification(`${e.action} completed on ${e.ship_id}`);
        refreshShipStatus();
    });

// System-wide events
ws.subscribe(`system.${systemId}`)
    .on('OtherDetected', (e) => {
        showAlert('Unknown ship detected in system');
    });

// Who's online in a system (presence)
ws.presence(`system.${systemId}`)
    .here((users) => updatePlayerList(users))
    .joining((user) => addPlayer(user))
    .leaving((user) => removePlayer(user));
```

### Pros

- Instant delivery — sub-second latency
- True push — no polling, no wasted requests
- Presence channels — know who's online and where
- Scales well (handles thousands of connections)

### Cons

- Requires a separate service (WebSocket server)
- Additional infrastructure to deploy and maintain
- WebSocket connections can drop, need reconnection logic
- Not all hosting environments support WebSocket proxying

## Option 2: WP Heartbeat API

WordPress has a built-in polling mechanism — the Heartbeat API. It sends AJAX requests at regular intervals (default 15-60 seconds). Every WordPress admin page already uses it. The idea: piggyback game events onto this existing system.

### Architecture

```
Browser                          WordPress (Helm)
   │                                  │
   │  Heartbeat tick (every 15-60s)   │
   ├─────────────────────────────────►│
   │                                  │  Check: any events for this user?
   │                                  │  Query pending notifications
   │  Response: events[]              │
   │◄─────────────────────────────────┤
   │                                  │
   │  Next tick...                    │
   ├─────────────────────────────────►│
```

### How It Works

**Server side (PHP):**
```php
// Queue an event for a user (stored in transient or custom table)
function helm_queue_event(int $userId, string $event, array $data): void {
    $events = get_transient("helm_events_{$userId}") ?: [];
    $events[] = [
        'event' => $event,
        'data' => $data,
        'timestamp' => time(),
    ];
    set_transient("helm_events_{$userId}", $events, HOUR_IN_SECONDS);
}

// Hook into Heartbeat to deliver events
add_filter('heartbeat_received', function (array $response, array $data) {
    if (!isset($data['helm_poll'])) {
        return $response;
    }

    $userId = get_current_user_id();
    $events = get_transient("helm_events_{$userId}") ?: [];

    if ($events !== []) {
        $response['helm_events'] = $events;
        delete_transient("helm_events_{$userId}");
    }

    return $response;
}, 10, 2);
```

**Client side (JavaScript):**
```javascript
// Send data with each heartbeat tick
wp.heartbeat.enqueue('helm_poll', { since: lastEventTimestamp });

// Receive events on each heartbeat response
jQuery(document).on('heartbeat-tick', (e, data) => {
    if (data.helm_events) {
        data.helm_events.forEach((event) => {
            handleGameEvent(event.event, event.data);
        });
    }
});
```

### Custom Tick Rate

The default Heartbeat interval (15-60 seconds) might be too slow for some events and too fast for battery life. Could implement a custom broadcast channel API on top:

```php
// Broadcast channel abstraction
class HelmBroadcast {
    /**
     * Push an event to a channel.
     * Storage: transients, custom table, or object cache.
     */
    public function push(string $channel, string $event, array $data): void {
        $key = "helm_channel_{$channel}";
        $messages = get_transient($key) ?: [];
        $messages[] = [
            'id' => wp_generate_uuid4(),
            'event' => $event,
            'data' => $data,
            'at' => time(),
        ];
        set_transient($key, $messages, HOUR_IN_SECONDS);
    }

    /**
     * Pull events from a channel since a timestamp.
     */
    public function pull(string $channel, int $since = 0): array {
        $key = "helm_channel_{$channel}";
        $messages = get_transient($key) ?: [];

        return array_filter($messages, fn($m) => $m['at'] > $since);
    }

    /**
     * Subscribe a user to channels.
     */
    public function subscribe(int $userId, array $channels): void {
        update_user_meta($userId, 'helm_subscribed_channels', $channels);
    }
}
```

```php
// On Heartbeat tick, pull from all subscribed channels
add_filter('heartbeat_received', function (array $response, array $data) {
    if (!isset($data['helm_channels'])) {
        return $response;
    }

    $broadcast = helm(HelmBroadcast::class);
    $userId = get_current_user_id();
    $since = (int) ($data['helm_channels']['since'] ?? 0);
    $channels = get_user_meta($userId, 'helm_subscribed_channels', true) ?: [];

    $events = [];
    foreach ($channels as $channel) {
        $channelEvents = $broadcast->pull($channel, $since);
        if ($channelEvents !== []) {
            $events[$channel] = $channelEvents;
        }
    }

    if ($events !== []) {
        $response['helm_channels'] = $events;
    }

    return $response;
}, 10, 2);
```

### Pros

- Zero additional infrastructure — it's just WordPress
- Works on any WordPress host (shared hosting, managed, anything)
- Already battle-tested (WordPress uses it for autosave, post locking)
- No WebSocket server to maintain
- No connection management, reconnection logic, or proxy configuration
- Respects WordPress auth natively

### Cons

- Polling, not push — 15-60 second delay
- Every tick is an HTTP request (server load scales with connected users)
- Not real-time — "near-time" at best
- No presence awareness (can't see who's online without extra work)
- Could be abused at high tick rates (server load)
- WordPress throttles Heartbeat on inactive tabs (60s minimum)

## Comparison

| Feature | WebSockets | Heartbeat (Polling) |
|---------|------------|---------------------|
| Latency | Sub-second | 15-60 seconds |
| Infrastructure | WebSocket server required | WordPress only |
| Hosting requirements | WebSocket support | Any WordPress host |
| Presence (who's online) | Built-in | Would need custom work |
| Server load | WebSocket connections (light) | HTTP requests per tick (heavier) |
| Scaling | Good (handles thousands) | Poor (HTTP request per user per tick) |
| Reliability | Connections can drop | Every tick is independent |
| Offline delivery | Missed while disconnected | Queued in transients |
| Complexity | Higher (separate service) | Lower (WordPress-native) |

## Approach: Heartbeat First, WebSockets When Needed

Start with Heartbeat. It fits the project philosophy: use WordPress APIs until we hit the limits of the platform. The game is async — actions take hours. A 15-second delay on notifications is invisible when your scan took 6 hours.

**Heartbeat handles everything initially:**
- Action completions
- System events
- Platform alerts
- Market activity
- State synchronization

**WebSockets come later when we need:**
- Presence (who's online, who's in this system)
- Sub-second delivery for time-sensitive events
- Scale beyond what Heartbeat polling can handle
- Real-time combat resolution (if combat becomes synchronous)

### Unified Event Interface

Both could share the same event interface on the PHP side:

```php
interface GameBroadcaster {
    public function push(string $channel, string $event, array $data): void;
}

// WebSocket implementation — instant push
class WebSocketBroadcaster implements GameBroadcaster {
    public function push(string $channel, string $event, array $data): void {
        $this->ws->broadcast($channel, $event, $data);
    }
}

// Heartbeat implementation — queue for next poll
class HeartbeatBroadcaster implements GameBroadcaster {
    public function push(string $channel, string $event, array $data): void {
        $this->queueForHeartbeat($channel, $event, $data);
    }
}

// Composite — push to both (instant + guaranteed delivery)
class CompositeBroadcaster implements GameBroadcaster {
    public function push(string $channel, string $event, array $data): void {
        // Try WebSocket first (instant)
        $this->ws->push($channel, $event, $data);
        // Also queue for Heartbeat (guaranteed delivery if WS missed it)
        $this->heartbeat->push($channel, $event, $data);
    }
}
```

The game code doesn't care which transport delivers the event. It just calls `push()`. The infrastructure decides how it gets there.

## Channel Design

Every channel is private. The user is always authenticated through WordPress — we always know who's asking. Authorization logic determines what events a user receives based on their ships, location, and subscriptions.

```
PRIVATE CHANNELS (all authenticated via WordPress)
├── private-user.{user_id}              — personal notifications, action completions
├── private-ship.{ship_post_id}         — ship-specific events (authorized to owner)
├── private-system.{star_id}            — system events (authorized if ship is present)
├── private-station.{station_id}        — station/market events (authorized if docked)
└── private-sector.{sector_id}          — sector-wide events (authorized if ship is in sector)

PRESENCE CHANNELS (shows who's connected)
├── presence-system.{star_id}           — who's in this system
├── presence-station.{station_id}       — who's docked at this station
└── presence-sector.{sector_id}         — who's in this sector
```

Channel authorization checks ship position, ownership, and game state to determine access. A player can only subscribe to a system channel if they have a ship in that system.

## Helm Event Types

All events are delivered through authenticated channels. The user's ships, location, and game state determine which events they receive.

```
SHIP EVENTS → private-ship.{ship_post_id}
├── action_completed      — scan, mine, jump, manufacture finished
├── action_failed         — action couldn't complete
├── ship_damaged          — hull/component damage from hazard or combat
├── cargo_full            — mining stopped, cargo at capacity
├── core_critical         — warp core life below threshold
├── power_restored        — power fully regenerated
└── arrived               — ship reached destination

PLATFORM EVENTS → private-user.{user_id}
├── platform_output       — platform cargo ready for collection
├── platform_threatened   — hostile activity near platform
├── platform_damaged      — platform took damage
└── platform_depleted     — belt count too low for efficient extraction

SYSTEM EVENTS → private-system.{star_id}
├── other_detected        — Other ship entered system
├── other_departed        — Other ship left system
├── belt_depleted         — belt crossed a depletion threshold
├── wreck_discovered      — new wreck appeared (ship destroyed)
└── station_request       — station posted a community goal

STATION EVENTS → private-station.{station_id}
├── large_trade           — significant transaction completed
├── price_shift           — average price changed significantly
└── new_listing           — notable item listed (high-usage component)

USER EVENTS → private-user.{user_id}
├── system_known          — new system became known space
├── first_discovery       — someone explored a new system
├── phase_change          — Others phase advanced
└── developer_announcement
```
