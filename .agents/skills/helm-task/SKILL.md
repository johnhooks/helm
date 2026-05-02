---
name: helm-task
description: Use when the user wants to define, refine, or draft a Helm task file in .plans/tasks using the repo's naming, metadata, and writing conventions.
---

Help the user think through a task and produce a task file in `.plans/tasks/`.
Use `.plans/README.md` as the lightweight project board and task index.

This is a conversation, not a one-shot generation. Work with the user to understand the problem before writing anything.

## Process

1. **Understand the problem.** If $ARGUMENTS gives enough context, use it as a starting point. If the request is obvious, narrow, and already scoped, skip straight to the draft. Otherwise ask the user what's wrong or missing today and why it matters. Explore the codebase if needed to ground the discussion in what actually exists.

2. **Clarify the desired outcome.** Talk through what the solution should look like at a high level. Push back if the user is jumping to implementation details. The task should capture what and why, not step-by-step how.

3. **Draft the task.** Once the problem and outcome are clear, write the task file and show it to the user. Ask if anything needs to change.

4. **Update the tracker.** Add or move the task in `.plans/README.md` so the tracking document reflects the task's current status.

5. **Report the file path** when the user is happy with it.

## Naming

Files live at `.plans/tasks/{namespace}-{NN}-{slug}.md`.

-   `namespace` groups related work (e.g. `nav`, `scan`, `combat`, `build`). Reuse an existing namespace if one fits. Invent a new one if none does.
-   `NN` is the next zero-padded sequence number within that namespace.
-   `slug` is a short hyphenated summary, four to six words.

## Writing style

Focus on the **what** and the **why**. The Problem section should make it clear what's wrong or missing today and why it matters. The Proposed solution section should describe the desired outcome and constraints, not step-by-step implementation instructions. Only get into the how if a non-obvious technical decision needs to be captured, such as which existing abstraction to extend or which WordPress hook to use.

Write in plain, direct language. No em dashes. No colons as sentence interrupters. Use imperative voice for the title, such as "Add X" or "Fix Y", not gerunds or questions.

Never mention Claude, AI, or the fact that this plan was generated. The plan is written for a future implementer who doesn't care how it got there.

## Metadata

The frontmatter uses these fields:

-   `status` (required): One of `draft`, `ready`, `active`, `blocked`, `done`. New tasks start as `draft` unless the user explicitly says the work is ready to implement.
-   `area` (required): The product or implementation area, such as `navigation`, `rest`, `testing`, `dsp`, `simulation`, `ui`, or `dev`.
-   `priority` (required): One of `p0`, `p1`, `p2`, `p3`. Use `p0` only for urgent broken-mainline or release-blocking work. Use `p1` for important planned work, `p2` for normal backlog work, and `p3` for cleanup or nice-to-have work.
-   `depends_on` (optional): A list of task ids that must land first, using the filename without `.md`, e.g. `nav-01-hide-current-star-actions`.
-   `blocked_by` (optional): A short human-readable blocker when `status` is `blocked`.
-   `pr` (optional): GitHub PR number once work is in progress or done, e.g. `"#145"`.

The task id is the filename without `.md`. Keep metadata short and factual. Do not duplicate the whole problem statement in frontmatter.

## Tracking

`.plans/README.md` is the project tracking document. Treat it as the repo-native board for current work, not as a replacement for the full task files.

Group tasks by status in this order:

1. `Active`
2. `Blocked`
3. `Ready`
4. `Draft`
5. `Done`

Each tracker entry should be one line:

```markdown
-   [task-id](tasks/task-id.md) - Short title. `area` `priority`
```

For blocked tasks, include the blocker after the priority:

```markdown
-   [task-id](tasks/task-id.md) - Short title. `area` `priority` Blocked by: dependency or decision.
```

When creating a task, add it to the section that matches its `status`. When changing a task's status, move it in `.plans/README.md` in the same edit. The tracker should summarize the queue and make the next implementable work obvious; details belong in the task files.

## Template

```markdown
---
status: draft
area: navigation
priority: p2
---

# {Imperative title in sentence case}

## Problem

{What's wrong or missing today, and why it matters.}

## Proposed solution

{The desired outcome and any constraints. Keep it focused on what should change, not how to implement it line by line.}
```
