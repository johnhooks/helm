# Federation: Trade Deals

How Origins negotiate cross-border economics. Politics as game mechanics.

> **Status:** Future work. This describes how federation WILL work when implemented.
> Current scope is single-Origin operation. We design APIs now that don't block this later.

## Overview

Each Origin is a sovereign economy. Federation doesn't mean open borders - it means negotiated relationships.

```
WITHOUT DEAL:
├── Origins share discovery data (map)
├── No economic transfers
├── Ships can't move between them
└── Completely separate economies

WITH DEAL:
├── Negotiated transfer limits
├── Tariffs and quotas
├── Ships can emigrate (with conditions)
└── Economies interact within bounds
```

## Trade Agreements

### Agreement Structure

```php
[
    'id' => 'deal-alpha-beta-001',
    'origins' => ['origin-alpha', 'origin-beta'],
    'type' => 'bilateral',  // or 'unilateral'
    'status' => 'active',
    'negotiated_at' => 1706472000,
    'expires_at' => 1722196800,  // 6 months
    'auto_renew' => true,
    'terms' => [
        'credits' => [...],
        'resources' => [...],
        'artifacts' => [...],
        'ships' => [...],
    ],
    'signatures' => [
        'origin-alpha' => 'signature...',
        'origin-beta' => 'signature...',
    ],
]
```

### Credit Terms

```php
'credits' => [
    'duty_free_limit' => 5000,      // No fee up to this amount
    'tariff_rate' => 100,            // 10% (scaled integer, 1000 = 100%)
    'max_per_transfer' => 100000,    // Single transfer cap
    'max_per_month' => 500000,       // Monthly cap per ship
    'approval_threshold' => 50000,   // Manual review above this
]
```

**Example scenarios:**

```
Transfer 3,000 CR:
├── Under duty_free_limit
├── No tariff
└── Automatic approval

Transfer 20,000 CR:
├── Over duty_free_limit
├── Tariff: (20000 - 5000) × 10% = 1,500 CR
├── Ship receives: 18,500 CR
└── Automatic approval

Transfer 75,000 CR:
├── Over approval_threshold
├── Requires manual review
├── Tariff calculated on approval
└── May be denied
```

### Resource Terms

```php
'resources' => [
    'common' => [
        'tariff_rate' => 50,         // 5%
        'quota' => null,              // Unlimited
        'approval' => 'automatic',
    ],
    'uncommon' => [
        'tariff_rate' => 100,        // 10%
        'quota' => 10000,             // Per month
        'approval' => 'automatic',
    ],
    'rare' => [
        'tariff_rate' => 200,        // 20%
        'quota' => 1000,              // Per month
        'approval' => 'review',       // Manual review
    ],
    'very_rare' => [
        'tariff_rate' => 500,        // 50%
        'quota' => 100,               // Per month
        'approval' => 'review',
    ],
]
```

### Artifact Terms

```php
'artifacts' => [
    'common' => [
        'allowed' => true,
        'tariff_rate' => 100,        // 10% of appraised value
        'approval' => 'automatic',
    ],
    'uncommon' => [
        'allowed' => true,
        'tariff_rate' => 150,
        'approval' => 'automatic',
    ],
    'rare' => [
        'allowed' => true,
        'tariff_rate' => 200,
        'approval' => 'review',
    ],
    'legendary' => [
        'allowed' => true,
        'tariff_rate' => 300,
        'approval' => 'review',
    ],
    'ancient' => [
        'allowed' => false,          // Cannot transfer
        'note' => 'Ancient artifacts are bound to origin',
    ],
]
```

### Ship Terms

```php
'ships' => [
    'allowed' => true,
    'min_age_days' => 30,            // Ship must exist for 30 days
    'min_reputation' => 100,         // Minimum reputation score
    'cooldown_days' => 90,           // Can't transfer again for 90 days
    'approval' => 'automatic',       // If requirements met
    'starting_credits' => 1000,      // Bonus CR on arrival (welcome gift)
]
```

## Deal Types

### Free Trade

Maximum openness between trusted allies.

```php
FREE_TRADE_TEMPLATE = [
    'credits' => [
        'duty_free_limit' => 100000,
        'tariff_rate' => 0,
        'max_per_transfer' => null,  // Unlimited
        'max_per_month' => null,
        'approval_threshold' => null,
    ],
    'resources' => [
        '*' => [  // All types
            'tariff_rate' => 0,
            'quota' => null,
            'approval' => 'automatic',
        ],
    ],
    'artifacts' => [
        '*' => [
            'allowed' => true,
            'tariff_rate' => 0,
            'approval' => 'automatic',
        ],
    ],
    'ships' => [
        'allowed' => true,
        'min_age_days' => 0,
        'min_reputation' => 0,
        'cooldown_days' => 0,
    ],
];
```

### Standard Trade

Balanced terms for normal federation members.

```php
STANDARD_TRADE_TEMPLATE = [
    'credits' => [
        'duty_free_limit' => 5000,
        'tariff_rate' => 100,        // 10%
        'max_per_transfer' => 100000,
        'max_per_month' => 500000,
        'approval_threshold' => 50000,
    ],
    'resources' => [
        'common' => ['tariff_rate' => 50, 'quota' => null],
        'uncommon' => ['tariff_rate' => 100, 'quota' => 10000],
        'rare' => ['tariff_rate' => 200, 'quota' => 1000],
        'very_rare' => ['tariff_rate' => 300, 'quota' => 100],
    ],
    'artifacts' => [
        'common' => ['allowed' => true, 'tariff_rate' => 100],
        'uncommon' => ['allowed' => true, 'tariff_rate' => 150],
        'rare' => ['allowed' => true, 'tariff_rate' => 200, 'approval' => 'review'],
        'legendary' => ['allowed' => true, 'tariff_rate' => 300, 'approval' => 'review'],
        'ancient' => ['allowed' => false],
    ],
    'ships' => [
        'allowed' => true,
        'min_age_days' => 30,
        'min_reputation' => 100,
        'cooldown_days' => 90,
    ],
];
```

### Restricted Trade

Limited engagement, higher barriers.

```php
RESTRICTED_TRADE_TEMPLATE = [
    'credits' => [
        'duty_free_limit' => 0,
        'tariff_rate' => 250,        // 25%
        'max_per_transfer' => 10000,
        'max_per_month' => 50000,
        'approval_threshold' => 5000,
    ],
    'resources' => [
        'common' => ['tariff_rate' => 150, 'quota' => 5000],
        'uncommon' => ['tariff_rate' => 250, 'quota' => 1000],
        'rare' => ['tariff_rate' => 500, 'quota' => 100, 'approval' => 'review'],
        'very_rare' => ['allowed' => false],
    ],
    'artifacts' => [
        'common' => ['allowed' => true, 'tariff_rate' => 200],
        'uncommon' => ['allowed' => true, 'tariff_rate' => 300, 'approval' => 'review'],
        'rare' => ['allowed' => false],
        'legendary' => ['allowed' => false],
        'ancient' => ['allowed' => false],
    ],
    'ships' => [
        'allowed' => true,
        'min_age_days' => 180,
        'min_reputation' => 500,
        'cooldown_days' => 365,
    ],
];
```

### Discovery Only

Share knowledge, not economy.

```php
DISCOVERY_ONLY_TEMPLATE = [
    'credits' => ['allowed' => false],
    'resources' => ['allowed' => false],
    'artifacts' => ['allowed' => false],
    'ships' => ['allowed' => false],
    'discoveries' => [
        'share' => true,
        'verify' => true,
    ],
];
```

### Embargo

No economic relationship. May still share discovery data for practical reasons.

```php
EMBARGO_TEMPLATE = [
    'credits' => ['allowed' => false],
    'resources' => ['allowed' => false],
    'artifacts' => ['allowed' => false],
    'ships' => ['allowed' => false],
    'discoveries' => [
        'share' => false,  // Or true, depending on severity
    ],
];
```

## Negotiation

### Proposal Flow

```
Origin Alpha wants a deal with Origin Beta
    │
    ▼
Alpha drafts proposal:
POST /federation/deals/propose
{
    "to_origin": "origin-beta",
    "terms": {...},
    "message": "Let's open trade relations!"
}
    │
    ▼
Beta receives proposal notification
    │
    ▼
Beta reviews, counter-proposes:
POST /federation/deals/counter
{
    "proposal_id": "prop-12345",
    "terms": {...},  // Modified terms
    "message": "We want higher credit limits"
}
    │
    ▼
Back and forth until agreement
    │
    ▼
Both sign:
POST /federation/deals/sign
{
    "proposal_id": "prop-12345",
    "signature": "..."
}
    │
    ▼
Deal is active
```

### Proposal States

```
DRAFT      → Origin preparing terms
PROPOSED   → Sent to other origin
COUNTERED  → Counter-proposal sent
ACCEPTED   → Terms agreed, awaiting signatures
SIGNED     → Both signed, deal active
REJECTED   → Negotiation failed
EXPIRED    → No response in time
```

### Modification & Termination

```
MODIFY:
├── Either party proposes amendment
├── Must be accepted by both
├── New terms replace old

TERMINATE:
├── Either party can exit
├── Notice period (e.g., 30 days)
├── Graceful wind-down of active transfers
├── Reverts to no-deal status

SUSPEND:
├── Temporary pause
├── Active transfers complete
├── New transfers blocked
├── Can resume without renegotiation
```

## Transfer Execution

### Transfer Request

```php
[
    'id' => 'transfer-12345',
    'type' => 'emigration',  // or 'item_transfer'
    'ship_id' => 'ship-enterprise',
    'from_origin' => 'origin-alpha',
    'to_origin' => 'origin-beta',
    'deal_id' => 'deal-alpha-beta-001',
    'contents' => [
        'credits' => 25000,
        'resources' => [
            'iron' => 500,
            'platinum' => 50,
        ],
        'artifacts' => [
            'artifact-nav-array-7x9k2',
        ],
    ],
    'status' => 'pending',
    'requested_at' => 1706558400,
]
```

### Validation

```php
class TransferValidator
{
    public function validate(Transfer $transfer, Deal $deal): ValidationResult
    {
        $errors = [];
        $fees = [];

        // Check ship eligibility
        if ($transfer->type === 'emigration') {
            $ship = $this->ships->find($transfer->ship_id);

            if ($ship->age_days < $deal->terms['ships']['min_age_days']) {
                $errors[] = "Ship too new. Minimum: {$deal->terms['ships']['min_age_days']} days";
            }

            if ($ship->reputation < $deal->terms['ships']['min_reputation']) {
                $errors[] = "Reputation too low. Minimum: {$deal->terms['ships']['min_reputation']}";
            }
        }

        // Check credits
        if ($transfer->contents['credits'] > 0) {
            $creditTerms = $deal->terms['credits'];

            if ($transfer->contents['credits'] > $creditTerms['max_per_transfer']) {
                $errors[] = "Exceeds max transfer: {$creditTerms['max_per_transfer']}";
            }

            $monthlyTotal = $this->getMonthlyTotal($transfer->ship_id, 'credits');
            if ($monthlyTotal + $transfer->contents['credits'] > $creditTerms['max_per_month']) {
                $errors[] = "Exceeds monthly quota";
            }

            // Calculate tariff
            $taxable = max(0, $transfer->contents['credits'] - $creditTerms['duty_free_limit']);
            $tariff = intdiv($taxable * $creditTerms['tariff_rate'], 1000);
            $fees['credits'] = $tariff;
        }

        // Check resources
        foreach ($transfer->contents['resources'] as $resource => $quantity) {
            $rarity = $this->getResourceRarity($resource);
            $terms = $deal->terms['resources'][$rarity];

            if (!($terms['allowed'] ?? true)) {
                $errors[] = "Resource not allowed: {$resource}";
                continue;
            }

            if (isset($terms['quota'])) {
                $monthlyTotal = $this->getMonthlyTotal($transfer->ship_id, $resource);
                if ($monthlyTotal + $quantity > $terms['quota']) {
                    $errors[] = "Exceeds quota for {$resource}";
                }
            }

            $tariff = intdiv($quantity * $this->getResourceValue($resource) * $terms['tariff_rate'], 1000);
            $fees['resources'][$resource] = $tariff;
        }

        // Check artifacts
        foreach ($transfer->contents['artifacts'] as $artifactId) {
            $artifact = $this->artifacts->find($artifactId);
            $terms = $deal->terms['artifacts'][$artifact->rarity];

            if (!$terms['allowed']) {
                $errors[] = "Artifact rarity not allowed: {$artifact->rarity}";
                continue;
            }

            $tariff = intdiv($artifact->appraised_value * $terms['tariff_rate'], 1000);
            $fees['artifacts'][$artifactId] = $tariff;
        }

        // Determine approval type
        $needsReview = $this->needsManualReview($transfer, $deal);

        return new ValidationResult(
            valid: empty($errors),
            errors: $errors,
            fees: $fees,
            total_fees: $this->sumFees($fees),
            approval: $needsReview ? 'review' : 'automatic',
        );
    }
}
```

### Execution Flow

```
Transfer requested
    │
    ▼
Validation (fees calculated, eligibility checked)
    │
    ├── Invalid? → Rejected with reasons
    │
    ▼
Approval check
    │
    ├── Needs review? → Queued for admin
    │
    ▼
Automatic or approved
    │
    ▼
Source origin: Lock/deduct assets
    │
    ▼
Fees deducted (go to destination origin treasury)
    │
    ▼
Destination origin: Credit assets (minus fees)
    │
    ▼
If emigration: Ship record moves to destination
    │
    ▼
Transfer complete, recorded in both origins
```

### Cross-Origin Communication

```php
// Source origin initiates
POST https://beta.helm.game/federation/transfer/receive
{
    "transfer_id": "transfer-12345",
    "deal_id": "deal-alpha-beta-001",
    "ship": {
        "id": "ship-enterprise",
        "reputation": 450,
        "created_at": 1704067200,
        "discoveries": ["HIP_8102", "HIP_5340", ...],
    },
    "contents": {
        "credits": 23500,  // After fees
        "resources": {...},
        "artifacts": [...],
    },
    "source_signature": "...",
}

// Destination verifies and accepts
{
    "status": "accepted",
    "ship_id": "ship-enterprise",  // Now exists on Beta
    "destination_signature": "...",
}

// Source confirms and removes
POST https://alpha.helm.game/federation/transfer/confirm
{
    "transfer_id": "transfer-12345",
    "destination_signature": "...",
}

// Source removes ship from its records
```

## Tariff Revenue

Where do the fees go?

```
TARIFF DISTRIBUTION:
├── Destination origin treasury (default)
├── Or split between origins
├── Or burned (deflationary)
├── Configurable per-deal
```

```php
'tariff_distribution' => [
    'destination' => 800,   // 80% to receiving origin
    'source' => 100,        // 10% to sending origin
    'burned' => 100,        // 10% destroyed
]
```

Origins can use treasury for:
- Block rewards (subsidize new players)
- Infrastructure (NPC stations)
- Events/prizes
- Whatever the admin decides

## Emergent Gameplay

### Arbitrage

```
PRICE DIFFERENCES:
├── Iron is 5 CR on Alpha (mining hub)
├── Iron is 12 CR on Gamma (industrial)
├── Alpha-Gamma deal: 5% tariff on common resources

TRADER CALCULATION:
├── Buy 1000 iron on Alpha: 5,000 CR
├── Transfer cost: 5% = 250 CR
├── Sell 1000 iron on Gamma: 12,000 CR
├── Profit: 6,750 CR

Trade routes emerge from deal structures.
```

### Origin Shopping

```
SHIP LOOKING TO EMIGRATE:
├── Alpha: 10% credit tariff, 30-day minimum
├── Beta: 5% credit tariff, 90-day minimum, higher reputation req
├── Gamma: 0% tariff but 500 rep minimum

Ship chooses based on their situation.
New ships → Alpha (easier entry)
Rich veterans → Gamma (no tariff but high bar)
```

### Political Pressure

```
PLAYERS LOBBYING:
├── "Alpha admin, please negotiate better terms with Beta!"
├── "Our traders are losing money to tariffs"
├── "Beta just embargoed us, let's embargo them back"

ADMIN DECISIONS:
├── Balance player desires vs origin stability
├── Protect local economy vs open trade
├── Form alliances vs stay independent
```

### Trade Wars

```
ESCALATION:
├── Alpha raises tariffs on Beta goods
├── Beta retaliates with higher tariffs
├── Trade volume drops
├── Players on both sides suffer
├── Pressure to negotiate

RESOLUTION:
├── Third-party mediation?
├── Players vote with their feet (emigrate)
├── Eventually one side caves
├── New deal negotiated
```

### Smuggling (Future Mechanic)

```
CONCEPT:
├── Exceed quotas illegally
├── Declare less than you're carrying
├── Risk: random inspections
├── Caught: confiscation + reputation hit + ban

ADDS:
├── Risk/reward gameplay
├── Reason to have enforcement
├── Cat and mouse
└── Probably phase 2
```

## API Endpoints

### Deal Management

```
GET    /federation/deals                    - List all deals
GET    /federation/deals/{id}               - Get deal details
POST   /federation/deals/propose            - Propose new deal
POST   /federation/deals/{id}/counter       - Counter-propose
POST   /federation/deals/{id}/accept        - Accept terms
POST   /federation/deals/{id}/sign          - Sign deal
POST   /federation/deals/{id}/reject        - Reject proposal
POST   /federation/deals/{id}/terminate     - End deal
POST   /federation/deals/{id}/suspend       - Pause deal
POST   /federation/deals/{id}/resume        - Resume deal
```

### Transfers

```
POST   /federation/transfer/request         - Request transfer
GET    /federation/transfer/{id}            - Get transfer status
POST   /federation/transfer/{id}/cancel     - Cancel pending transfer
GET    /federation/transfer/validate        - Preview validation/fees

# Origin-to-origin endpoints
POST   /federation/transfer/receive         - Receive incoming transfer
POST   /federation/transfer/confirm         - Confirm transfer complete
```

### Quotas & Limits

```
GET    /federation/quotas                   - Get remaining quotas
GET    /federation/quotas/{origin}          - Quotas for specific deal
```

## Summary

Federation through trade deals:

1. **Origins are sovereign** - Each runs its own economy
2. **Deals are negotiated** - Not automatic, requires agreement
3. **Terms are flexible** - Tariffs, quotas, limits, approval requirements
4. **Transfers are controlled** - Can't just flood another origin
5. **Fees create incentives** - Arbitrage, origin shopping, politics
6. **Emergent gameplay** - Trade wars, alliances, smuggling

**The federation is:**
- A web of bilateral agreements
- Not a single global system
- Political and economic
- Player-influenced through lobbying
- Admin-controlled through negotiation

**No blockchain needed.** Just diplomacy, rules, and game mechanics.
