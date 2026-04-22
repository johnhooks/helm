---
name: helm-commit
description: Use when the user wants to prepare a Helm git commit, choose a commit type, or format a commit message using the repo's commit conventions.
---

# Commit

Create git commits for Helm.

## Format

```
type: brief description (max 50 chars)

Optional body line with more detail (max 80 chars)
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code restructuring
- `test`: Tests only
- `chore`: Maintenance, deps

## Rules

1. Title: max 50 characters
2. Body: optional single line, max 80 characters
3. Lowercase, no period
4. No emoji, no co-author lines

## Process

1. Run `git status` and `git diff` to understand changes
2. Stage files with `git add`
3. Commit: `git commit -m "type: description"`

## Examples

Good:
```
feat: add navigation computer

deterministic waypoint generation with corridor seeds
```

```
fix: correct waypoint scatter calculation
```

Bad:
```
feat: add navigation computer with deterministic waypoints and corridor seeds
```
