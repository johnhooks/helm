---
status: done
area: rest
priority: p3
---

# Align ship state resource serialization

## Problem

Helm now has a domain resource for operational ship state so broadcast payloads and REST responses can share canonical serialization. Ship action serialization already uses this resource pattern, but `ShipController` still builds the ship response with a private serializer that includes cargo and formats some fields differently than `ShipStateResource`.

That split is acceptable for now, but it can lead to drift as ship state broadcasts and REST responses evolve. It also makes it less obvious which fields are operational ship state and which fields belong to the broader ship REST representation.

## Proposed solution

Review `ShipController` and align its operational state serialization with `ShipStateResource` where practical. Keep REST-only links and broader ship-resource concerns outside the resource. If the existing ship endpoint must continue returning cargo or compatibility fields, make the boundary explicit so `ShipStateResource` remains the canonical representation of state owned by the ship state table.

This is not urgent because the current endpoint behavior still works, but the serialization should be unified before ship state broadcasts become an active frontend synchronization path.
