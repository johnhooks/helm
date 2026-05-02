# Economy: Ledger & Credits

How money works. Origin is the bank.

## Credits

The universal currency. Everyone knows what credits are.

```
Symbol: ¢ or CR
Denomination: Integer (no fractional credits)
Storage: Origin ledger (authoritative)
```

## Origin Is The Bank

Origin maintains the single source of truth for all balances.

```
ORIGIN LEDGER
├── ship-enterprise: 15,420 CR
├── ship-reliant: 8,750 CR
├── ship-voyager: 102,300 CR
└── ...

Ships don't store their own balance authoritatively.
Ships cache it. Origin knows the truth.
```

### Why Centralized?

```
Distributed balance tracking = nightmare

Problems:
├── Double-spend (pay two people with same money)
├── Race conditions (simultaneous transactions)
├── Network partitions (which balance is real?)
└── Reconciliation (whose ledger wins?)

Solution:
└── Origin is the bank. One ledger. One truth.
```

## Account Structure

### Ship Account

```php
[
    'ship_id' => 'ship-enterprise',
    'balance' => 15420,
    'created_at' => 1706472000,
    'last_transaction' => 1706558400,
    'status' => 'active',  // active, frozen, closed
]
```

### Special Accounts

```php
// System accounts for money flow tracking
[
    'account_id' => 'system:discovery_rewards',
    'type' => 'system',
    'balance' => -500000,  // Negative = money created
],
[
    'account_id' => 'system:station_fees',
    'type' => 'system',
    'balance' => 125000,   // Positive = money destroyed
],
[
    'account_id' => 'npc:tau_ceti_station',
    'type' => 'npc',
    'balance' => 1000000,  // NPC station treasury
],
```

## Transactions

Every credit movement is a transaction. No exceptions.

### Transaction Structure

```php
[
    'id' => 'tx-uuid-here',
    'type' => 'transfer',           // transfer, reward, fee, sale, purchase
    'from' => 'ship-enterprise',
    'to' => 'ship-reliant',
    'amount' => 500,
    'memo' => 'Payment for 50 iron ore',
    'reference' => 'trade-12345',   // Links to trade/sale record
    'timestamp' => 1706558400,
    'status' => 'completed',        // pending, completed, failed, reversed
]
```

### Transaction Types

```
TRANSFER
├── Ship to ship payment
├── Requires sender signature
└── Recipient doesn't need to accept (push model)

REWARD
├── System to ship (discovery bonus, mission reward)
├── Origin initiates
└── Money creation

FEE
├── Ship to system (station fees, market tax)
├── Automatic deduction
└── Money destruction

SALE
├── Ship sells to NPC station
├── NPC to ship payment
└── Linked to inventory change

PURCHASE
├── Ship buys from NPC station
├── Ship to NPC payment
└── Linked to inventory change

TRADE
├── Ship to ship exchange
├── Credits + items in one atomic transaction
└── Both parties sign
```

## Double-Entry Bookkeeping

Every transaction has two sides. Money doesn't appear or disappear (except from system accounts).

```
Ship A pays Ship B 500 CR:

DEBIT:  ship-a        -500
CREDIT: ship-b        +500
                      ----
NET CHANGE:              0
```

```
Ship earns discovery bonus 1000 CR:

DEBIT:  system:discovery_rewards  -1000  (money created)
CREDIT: ship-enterprise           +1000
```

```
Ship pays station fee 50 CR:

DEBIT:  ship-enterprise    -50
CREDIT: system:station_fees +50  (money destroyed)
```

### Ledger Integrity

```php
class Ledger
{
    public function verifyIntegrity(): bool
    {
        $sum = 0;

        foreach ($this->getAllAccounts() as $account) {
            $sum += $account->balance;
        }

        // All balances should sum to zero
        // (System accounts are negative when money is created)
        return $sum === 0;
    }
}
```

## Transfer Flow

### Ship to Ship Payment

```
Ship A wants to pay Ship B 500 CR
    │
    ▼
Ship A sends request to Origin:
POST /helm/ledger/transfer
{
    "from": "ship-enterprise",
    "to": "ship-reliant",
    "amount": 500,
    "memo": "Payment for ore",
    "signature": "...(ship A's signature)..."
}
    │
    ▼
Origin validates:
├── Signature valid?
├── Ship A has 500+ CR?
├── Ship B exists and active?
├── Amount positive integer?
    │
    ▼
Origin executes atomically:
├── Deduct 500 from ship-a
├── Add 500 to ship-b
├── Record transaction
    │
    ▼
Origin responds:
{
    "transaction_id": "tx-12345",
    "status": "completed",
    "new_balance": 14920
}
    │
    ▼
Ship A caches new balance
Ship B gets notified (event broadcast)
```

### Atomicity

```php
class LedgerService
{
    public function transfer(string $from, string $to, int $amount, string $memo): Transaction
    {
        // Validate
        $this->validateTransfer($from, $to, $amount);

        // Use database transaction for atomicity
        return $this->db->transaction(function() use ($from, $to, $amount, $memo) {
            // Lock accounts (prevent race conditions)
            $fromAccount = $this->accounts->lockForUpdate($from);
            $toAccount = $this->accounts->lockForUpdate($to);

            // Check balance again (inside lock)
            if ($fromAccount->balance < $amount) {
                throw new InsufficientFundsException();
            }

            // Execute transfer
            $fromAccount->balance -= $amount;
            $toAccount->balance += $amount;

            $this->accounts->save($fromAccount);
            $this->accounts->save($toAccount);

            // Record transaction
            $tx = new Transaction([
                'type' => 'transfer',
                'from' => $from,
                'to' => $to,
                'amount' => $amount,
                'memo' => $memo,
                'timestamp' => time(),
                'status' => 'completed',
            ]);

            $this->transactions->save($tx);

            return $tx;
        });
    }
}
```

## Balance Queries

### Ship Checks Balance

```
GET /helm/ledger/balance
Authorization: Bearer {ship-token}

Response:
{
    "ship_id": "ship-enterprise",
    "balance": 15420,
    "as_of": 1706558400
}
```

### Ship Caches Locally

```php
// Ship stores cached balance
update_option('helm_cached_balance', [
    'balance' => 15420,
    'as_of' => 1706558400,
]);

// Display uses cache
$balance = get_option('helm_cached_balance')['balance'];

// Periodically refresh from Origin
// Or refresh after any transaction
```

### Transaction History

```
GET /helm/ledger/transactions?limit=50
Authorization: Bearer {ship-token}

Response:
{
    "transactions": [
        {
            "id": "tx-12345",
            "type": "transfer",
            "from": "ship-enterprise",
            "to": "ship-reliant",
            "amount": 500,
            "memo": "Payment for ore",
            "timestamp": 1706558400,
            "balance_after": 14920
        },
        {
            "id": "tx-12344",
            "type": "sale",
            "from": "npc:tau_ceti_station",
            "to": "ship-enterprise",
            "amount": 1000,
            "memo": "Sold 100 iron ore",
            "timestamp": 1706555000,
            "balance_after": 15420
        }
    ],
    "cursor": "tx-12343"
}
```

## Money Supply

### Where Credits Come From

```
SOURCES (money creation)
├── Discovery bonuses
│   └── First discovery: 1000-10000 CR
├── NPC station purchases
│   └── Stations buy resources from players
├── Mission rewards (future)
│   └── Complete objectives for CR
└── Initial grant
    └── New ships start with X CR
```

### Where Credits Go

```
SINKS (money destruction)
├── Station fees
│   ├── Refining: 5% of material value
│   ├── Manufacturing: 10% of output value
│   └── Docking: 50 CR flat
├── Market tax
│   └── 2% on player-to-player sales
├── Services
│   ├── Repair: based on damage
│   └── Fuel: based on tank size
└── Blueprints
    └── NPC sells blueprints for CR
```

### Economic Balance

```php
class EconomyMonitor
{
    public function getMoneySupply(): array
    {
        $created = abs($this->accounts->getBalance('system:discovery_rewards'))
                 + abs($this->accounts->getBalance('system:npc_purchases'))
                 + abs($this->accounts->getBalance('system:initial_grants'));

        $destroyed = $this->accounts->getBalance('system:station_fees')
                   + $this->accounts->getBalance('system:market_tax')
                   + $this->accounts->getBalance('system:services');

        $circulating = $this->accounts
            ->whereType('ship')
            ->sum('balance');

        return [
            'total_created' => $created,
            'total_destroyed' => $destroyed,
            'circulating' => $circulating,
            'net' => $created - $destroyed,  // Should equal circulating
        ];
    }
}
```

## Initial Balance

### New Ship Grant

```php
class ShipRegistration
{
    private const INITIAL_BALANCE = 10000;  // 10k CR to start

    public function register(Ship $ship): void
    {
        // Create account
        $this->ledger->createAccount($ship->id);

        // Grant initial credits
        $this->ledger->grant(
            to: $ship->id,
            amount: self::INITIAL_BALANCE,
            memo: 'Initial ship commissioning grant',
            source: 'system:initial_grants'
        );
    }
}
```

## Trades (Credit + Items)

When trading items for credits, the transaction is atomic.

### Trade Structure

```php
[
    'id' => 'trade-12345',
    'seller' => 'ship-enterprise',
    'buyer' => 'ship-reliant',
    'items' => [
        ['item' => 'iron_ore', 'quantity' => 100],
    ],
    'price' => 500,
    'status' => 'completed',
    'credit_tx' => 'tx-67890',  // Links to credit transaction
    'timestamp' => 1706558400,
]
```

### Trade Flow

```
Ship A offers: 100 iron ore for 500 CR
    │
    ▼
Ship B accepts
    │
    ▼
Origin executes atomically:
    │
    ├── Verify A has 100 iron ore
    ├── Verify B has 500 CR
    │
    ├── Transfer 100 iron ore: A → B
    ├── Transfer 500 CR: B → A
    │
    ├── Record item transfer
    ├── Record credit transaction
    ├── Record trade (links both)
    │
    ▼
Both ships notified with results
```

### Atomic Trade Execution

```php
class TradeService
{
    public function executeTrade(Trade $trade): void
    {
        $this->db->transaction(function() use ($trade) {
            // Verify and transfer items
            foreach ($trade->items as $item) {
                $this->inventory->transfer(
                    from: $trade->seller,
                    to: $trade->buyer,
                    item: $item['item'],
                    quantity: $item['quantity']
                );
            }

            // Transfer credits
            $tx = $this->ledger->transfer(
                from: $trade->buyer,
                to: $trade->seller,
                amount: $trade->price,
                memo: "Trade {$trade->id}"
            );

            // Record trade completion
            $trade->status = 'completed';
            $trade->credit_tx = $tx->id;
            $this->trades->save($trade);
        });
    }
}
```

## NPC Transactions

### Selling to Station

```
Ship docks at station
Ship has: 100 iron ore
Station buys iron ore at: 5 CR/unit
    │
    ▼
Ship initiates sale:
POST /helm/station/sell
{
    "station": "tau_ceti_station",
    "item": "iron_ore",
    "quantity": 100
}
    │
    ▼
Origin:
├── Verify ship is docked at station
├── Verify ship has 100 iron ore
├── Get station buy price (5 CR)
├── Calculate total (500 CR)
│
├── Remove 100 iron ore from ship
├── Add 500 CR to ship (from npc account)
├── Record transaction
    │
    ▼
Response:
{
    "sold": 100,
    "unit_price": 5,
    "total": 500,
    "new_balance": 15920
}
```

### Buying from Station

```
Ship initiates purchase:
POST /helm/station/buy
{
    "station": "tau_ceti_station",
    "item": "fuel_cells",
    "quantity": 10
}
    │
    ▼
Origin:
├── Verify ship is docked
├── Get station sell price (100 CR/unit)
├── Calculate total (1000 CR)
├── Verify ship has 1000+ CR
│
├── Remove 1000 CR from ship (to npc account)
├── Add 10 fuel cells to ship
├── Record transaction
    │
    ▼
Response:
{
    "bought": 10,
    "unit_price": 100,
    "total": 1000,
    "new_balance": 14920
}
```

## Security

### Preventing Fraud

```
DOUBLE-SPEND
├── Database transactions with row locking
├── Balance checked inside lock
└── Single source of truth (Origin)

NEGATIVE BALANCE
├── Balance checked before every debit
├── Constraint: balance >= 0
└── Transaction rejected if insufficient

FORGED TRANSACTIONS
├── All requests signed by ship
├── Origin verifies signature
└── Invalid signature = rejected

REPLAY ATTACKS
├── Transaction IDs are unique
├── Timestamps checked for freshness
└── Nonce optional for extra safety
```

### Request Signing

```php
// Ship signs request
$request = [
    'action' => 'transfer',
    'to' => 'ship-reliant',
    'amount' => 500,
    'timestamp' => time(),
    'nonce' => bin2hex(random_bytes(16)),
];

$signature = sign(json_encode($request), $shipPrivateKey);

// Origin verifies
$valid = verify(
    json_encode($request),
    $signature,
    $this->getShipPublicKey($shipId)
);
```

## API Endpoints

### Ledger Endpoints

```
GET  /helm/ledger/balance           - Get ship's balance
GET  /helm/ledger/transactions      - Transaction history
POST /helm/ledger/transfer          - Ship to ship payment

POST /helm/station/sell             - Sell items to station
POST /helm/station/buy              - Buy items from station

POST /helm/trade/offer              - Create trade offer
POST /helm/trade/{id}/accept        - Accept trade offer
POST /helm/trade/{id}/cancel        - Cancel trade offer
```

## Summary

The credit system:

1. **Origin is the bank** - Single ledger, single truth
2. **Integer credits** - No fractions, no floats
3. **Double-entry** - Every transaction balances
4. **Atomic transfers** - Database transactions prevent corruption
5. **Signed requests** - Ships authenticate all actions
6. **Full history** - Every transaction recorded forever

Money flows:

```
Discovery → Ship → Station fees (sink)
                → Other ships
                → NPC purchases (items)

NPC sales → Ship → Market tax (sink)
                → Trades
```

The economy is closed. Money in = money out (via system accounts). Origin can monitor total supply and adjust faucets/sinks to maintain balance.
