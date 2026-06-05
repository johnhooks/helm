---
status: draft
area: dev
priority: p3
---

# Review HelmError display API

## Problem

`HelmError` currently stores the machine-readable error code in `Error.message` and stores the user-facing display string in `detail`. This is intentional and keeps stable codes visible when errors pass through generic JavaScript error handling, but it is easy to forget because it differs from WordPress REST and `WP_Error`, where `code` is the machine value and `message` is the display value.

Ship action errors make this friction visible. Persisted action results store serialized WordPress REST errors under `result.error`, and the UI converts those into `HelmError` instances before rendering. Future implementers need to know whether to display `detail`, inspect `message`, or preserve the original REST shape. The current API works, but the naming may continue to cause mistakes.

## Proposed solution

Review the `HelmError` API and decide whether the current `message` as code and `detail` as display convention should stay.

The decision should answer these questions:

- Should `HelmError` keep using `Error.message` as the stable machine-readable code?
- Should `HelmError` add an explicit `code` alias even if `message` remains the code for compatibility?
- Should display helpers prefer `detail` directly, or should they go through a formatter that makes the code/detail distinction harder to misuse?
- How should serialized WordPress REST errors and `additional_errors` map into `HelmError` going forward?

If the API changes, update the error package, callers, tests, and documentation together so UI code has one obvious way to render safe user-facing error text.
