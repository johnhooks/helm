# Ship Actions

A ship action records a command performed by a ship, such as a jump or route
scan. It persists the command, execution state, public results, and lifecycle in
`helm_ship_actions`, represented by `Helm\ShipLink\Models\Action`.

## Structure

| Field                        | Purpose                                                                                                         |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `id`, `ship_post_id`, `type` | Identify the action, its ship, and the operation.                                                               |
| `params`                     | Accepted command and context, populated during initialization and unchanged during execution.                   |
| `runtime_state`              | Private execution bookkeeping and history retained after termination.                                            |
| `result`                     | Accumulated public state produced during execution, exposed through the API while running and after completion. |
| `status`                     | Lifecycle state: `pending`, `running`, `fulfilled`, `partial`, or `failed`.                                     |
| `deferred_until`             | Due time for the next processing checkpoint, not necessarily the whole action's completion time.                |
| `processing_at`, `attempts`  | Worker locking and retry bookkeeping.                                                                           |
| `created_at`, `updated_at`   | Record timestamps.                                                                                              |

## Usage

Validation and initialization establish `params`, including server-captured
context such as the origin. Do not modify params mid-flight. Changing execution
cursors, timing anchors, attempts, and private calculations belong in
`runtime_state`.

Resolvers perform work at scheduled checkpoints, update execution state, and
collect public facts in `result`. Results are not restricted to terminal states:
completed legs or discoveries can be published while an action continues.
Keep private mechanics out of results. Runtime state is excluded from public
action resources; deliberately represent any information the API needs in
`result` instead of exposing the internal object wholesale.

If work remains, keep the action non-final and schedule its next checkpoint.
`fulfilled`, `partial`, and `failed` are terminal; `partial` means execution has
stopped with a partial outcome, not that an active action has made progress.
Consumers use `status` to determine finality, not the presence of a result.
Retain runtime state after termination for debugging. Completed or failed actions
must not resume because that state still exists. Scan history includes discoveries,
misses, and continuation rolls; its `depth` counts discovered hops.

Persistent ship facts, such as position and remaining core life, belong in ship
state or components. Action data records the command, its execution, and the
public facts it produced. Each action type defines its own params, runtime, and
result shapes within this contract.

Jump and route scan use action-specific `Params` and `Result` objects with
`fromArray()` / `toArray()` storage boundaries. Scan also has a `RuntimeState`
object; jump does not currently use private runtime state. Nested discovery,
leg, and cycle records use PHPStan array shapes. Validators check raw command
input; DTOs describe the data used during execution.
