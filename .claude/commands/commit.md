# Commit

Create git commits for Helm.

## Format

Single line conventional commits:

```
type: brief description (max 72 chars)
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `refactor`: Code restructuring
- `test`: Tests only
- `chore`: Maintenance, deps

## Rules

1. Single line, max 72 characters
2. Lowercase, no period
3. No emoji, no co-author lines
4. Be concise

## Process

1. Run `git status` and `git diff` to understand changes
2. Stage files with `git add`
3. Commit: `git commit -m "type: description"`

## Examples

Good:
```
feat: add navigation computer with deterministic waypoints
fix: correct waypoint scatter calculation
refactor: rename repository methods to create()
docs: update navigation plan with scan mechanics
```

Bad:
```
Update stuff
Added new features and fixed bugs
feat: Add Navigation Computer System For Computing Routes 📝
```
