# Taking Component Screenshots

This document describes how to capture screenshots of Storybook components for visual verification.

## Prerequisites

-   Storybook must be running (`bun run storybook`)
-   Playwright must be installed (`@playwright/test` is already in devDependencies)

## Starting Storybook

From the project root:

```bash
# Start Storybook on port 6006
bun run storybook

# Or start without opening browser (for CI/automation)
CI=true bun run storybook --no-open
```

## Capturing Screenshots

Use Playwright's CLI screenshot command:

```bash
# Basic screenshot
npx playwright screenshot "http://localhost:6006/iframe.html?id=<story-id>&viewMode=story" /path/to/output.png

# With wait time for rendering
npx playwright screenshot --wait-for-timeout=2000 "http://localhost:6006/iframe.html?id=<story-id>&viewMode=story" /path/to/output.png
```

### Story ID Format

The story ID follows the pattern: `category-component--story-name`

Examples:

-   `layout-widget--left-widget`
-   `layout-widget--tactical-station-pair`
-   `layout-widget--science-station-pair`
-   `layout-widget--color-variants`

### Finding Story IDs

1. Open Storybook in browser
2. Navigate to the story
3. The URL will show the story ID: `?path=/story/layout-widget--left-widget`
4. Use the ID part after `/story/` in the iframe URL

## Example Commands

```bash
# Capture Left Widget story
npx playwright screenshot --wait-for-timeout=2000 \
  "http://localhost:6006/iframe.html?id=layout-widget--left-widget&viewMode=story" \
  /tmp/widget-left.png

# Capture Tactical Station Pair
npx playwright screenshot --wait-for-timeout=2000 \
  "http://localhost:6006/iframe.html?id=layout-widget--tactical-station-pair&viewMode=story" \
  /tmp/tactical-pair.png

# Capture with viewport size
npx playwright screenshot --wait-for-timeout=2000 --viewport-size="1200,800" \
  "http://localhost:6006/iframe.html?id=layout-widget--left-widget&viewMode=story" \
  /tmp/widget-large.png
```

## Automated Screenshot Script

For batch capturing multiple components:

```bash
#!/bin/bash
STORIES=(
  "layout-widget--left-widget"
  "layout-widget--right-widget"
  "layout-widget--tactical-station-pair"
)

for story in "${STORIES[@]}"; do
  npx playwright screenshot --wait-for-timeout=2000 \
    "http://localhost:6006/iframe.html?id=${story}&viewMode=story" \
    "./screenshots/${story}.png"
done
```

## Tips

-   Use `--wait-for-timeout=2000` to ensure components fully render (especially with animations)
-   Screenshots are saved to the specified path (use `/tmp/` for temporary files)
-   The iframe URL (`iframe.html`) renders just the component without Storybook's UI
-   Add `&globals=backgrounds.value:!hex(000000)` to force dark background if needed
