---
name: helm-task
description: Use when the user wants to define, refine, or draft a Helm task file in .plans/tasks using the repo's naming, metadata, and writing conventions.
---

Help the user think through a task and produce a task file in `.plans/tasks/`.

This is a conversation, not a one-shot generation. Work with the user to understand the problem before writing anything.

## Process

1. **Understand the problem.** If $ARGUMENTS gives enough context, use it as a starting point. If the request is obvious, narrow, and already scoped, skip straight to the draft. Otherwise ask the user what's wrong or missing today and why it matters. Explore the codebase if needed to ground the discussion in what actually exists.

2. **Clarify the desired outcome.** Talk through what the solution should look like at a high level. Push back if the user is jumping to implementation details. The task should capture what and why, not step-by-step how.

3. **Draft the task.** Once the problem and outcome are clear, write the task file and show it to the user. Ask if anything needs to change.

4. **Report the file path** when the user is happy with it.

## Naming

Files live at `.plans/tasks/{namespace}-{NN}-{slug}.md`.

- `namespace` groups related work (e.g. `nav`, `scan`, `combat`, `build`). Reuse an existing namespace if one fits. Invent a new one if none does.
- `NN` is the next zero-padded sequence number within that namespace.
- `slug` is a short hyphenated summary, four to six words.

## Writing style

Focus on the **what** and the **why**. The Problem section should make it clear what's wrong or missing today and why it matters. The Proposed solution section should describe the desired outcome and constraints, not step-by-step implementation instructions. Only get into the how if a non-obvious technical decision needs to be captured, such as which existing abstraction to extend or which WordPress hook to use.

Write in plain, direct language. No em dashes. No colons as sentence interrupters. Use imperative voice for the title, such as "Add X" or "Fix Y", not gerunds or questions.

Never mention Claude, AI, or the fact that this plan was generated. The plan is written for a future implementer who doesn't care how it got there.

## Metadata

The frontmatter uses these fields:

- `status` (required): One of `draft`, `todo`, `in-progress`, `done`. New tasks start as `draft`.
- `pr` (optional): GitHub PR number once work is in progress or done, e.g. `"#145"`.

## Template

```markdown
---
status: draft
---

# {Imperative title in sentence case}

## Problem

{What's wrong or missing today, and why it matters.}

## Proposed solution

{The desired outcome and any constraints. Keep it focused on what should change, not how to implement it line by line.}
```
