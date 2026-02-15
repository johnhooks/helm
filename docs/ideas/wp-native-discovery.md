# Native WordPress Discovery Layer

## The Idea

Stars are already WordPress custom post types. WordPress gives every post type three things for free: custom statuses, a comment system, and RSS feeds. Used together, they turn star discovery into a social experience with passive notifications — no custom tables, no push infrastructure, no notification service.

The star map renders from the datacore and is unaffected by any of this. What changes is what happens *around* a star once a player reaches it: the star gets a story, a guestbook, and a feed presence.

## What This Creates for Players

**Every discovery is a story.** When a player arrives at an uncharted star, AI generates a short narrative from the star data, ship state, player history, and arrival conditions. A battered ship limping in on fumes gets a different story than a fresh explorer on day one. A binary system with six planets reads differently than a lone red dwarf. The narrative becomes the star's permanent record.

**Stars have guestbooks.** Players can leave comments on a star — but only while their ship is in that system. This means every comment is proof someone was there. Hub systems near the origin accumulate active threads; remote stars have sparse, meaningful entries. If someone replies to your comment at a distant star, they flew back to do it. Travel time is the moderation system — multi-day journeys are the best spam filter possible.

**Discoverers name stars.** The first player to reach an uncharted star gets to give it a common name. The catalog designation stays as the permanent identifier; the player-chosen name is a social layer on top.

**RSS makes it passive.** Players subscribe to feeds in any RSS reader and see discoveries and comments without logging in. The discovery feed is a chronicle of exploration — each item is a star with its AI-generated narrative. Star comment feeds show who visited and what they said. Regional feeds track activity in a constellation. It fits the game's rhythm: check your reader over coffee, see what happened overnight.

## How It Works

### Stars start unpublished

Currently, all stars are seeded with `publish` status. This proposal changes that: stars seed as `draft`. They still render on the star map (the datacore doesn't care about post status), but they have no WordPress presence — no content, no comments, no feed entry. They're data waiting to become posts.

### Discovery publishes the star

When a player's travel action completes at a draft star, three things happen in a single update:

1. The status transitions from `draft` to a custom `helm_charted` status (public).
2. AI-generated discovery content is written to `post_content`.
3. `post_date` is set to the moment of discovery.

Setting `post_date` to now is what makes RSS work. WordPress feeds order by `post_date` DESC, so the star appears at the top of the feed as a genuinely new post — not buried at whatever date it was seeded.

WordPress closes comments on drafts by default. The moment a star is published, comments open automatically. The guestbook unlocks with the discovery.

### Custom statuses track the star's lifecycle

All custom statuses are public. They describe what has happened at a star over time:

| Status | Meaning |
|--------|---------|
| `draft` | Seeded, undiscovered. On the map but no WordPress presence. |
| `helm_charted` | Discovered. Has content, open comments, appears in feeds. |
| `helm_surveyed` | A full scan has been completed. Additional detail in content. |
| `helm_depleted` | Resources mined out. |
| `helm_contested` | Multiple factions present. |

Each transition fires the `transition_post_status` hook, so other systems can react without coupling — award XP on first discovery, notify nearby players when a star becomes contested, append scan results to the content when surveyed.

Status lives in `post_status` rather than post meta because it's indexed (fast queries), it controls feed visibility (drafts excluded, public statuses included), it gates comments (closed on drafts, open on public), and it has a built-in hook for transitions. Post meta would need custom logic for all of this.

### Comments are location-gated

The comment REST endpoint gets a filter that checks whether the player's ship is currently at the star they're commenting on. If not, the request is rejected. This is the only custom logic needed — everything else (threading, author tracking, timestamps, REST API, feeds) is standard WordPress.

### AI generates the discovery narrative

The generation prompt includes:

- **Star data** — spectral class, luminosity, distance, constellation, planets, notable properties.
- **Ship state** — name, hull condition, fuel remaining, shield strength, system wear.
- **Player history** — how many stars they've charted, distance traveled, notable previous discoveries.
- **Arrival context** — date and time, travel duration, side effects (fuel spent, damage taken, anomalies encountered).

The output is a brief narrative from the perspective of a ship's log. It goes into `post_content`, which means it appears in RSS feed items automatically, is visible in the WordPress admin, and is searchable. No custom rendering needed.

### RSS feeds come free

WordPress generates feeds for public post types, taxonomy terms, and comment threads:

| Feed | What it shows |
|------|---------------|
| Discovery feed | Newly discovered stars with AI-generated narratives. |
| Regional feed | Stars discovered in a specific constellation. |
| Star guestbook feed | Comments at a specific star. |
| Galaxy-wide chatter | Comments across all discovered stars. |

Feeds are paginated (default 10 items). Of 4000 seeded stars, only discovered ones appear. A reader checking daily sees only what was found since yesterday.

For federation, RSS is a standard protocol. Another Origin subscribes to the discovery feed and sees exploration happening in real time — no custom API needed.

## What Would Need to Change

### Star seeding

Stars are currently seeded as `publish`. The batch generator would need to seed them as `draft` instead. Existing stars would need a migration to set undiscovered ones back to `draft`.

### Post type registration

The `helm_star` CPT currently supports `['title', 'custom-fields']`. It would need `'comments'` added to the supports array. The custom statuses (`helm_charted`, `helm_surveyed`, etc.) need to be registered.

### Travel action completion

The travel action handler currently updates ship location. It would also need to check the destination star's status and, if `draft`, trigger the discovery flow: generate the narrative, publish the star, and prompt the player to name it.

### Comment permissions

A filter on the comment REST endpoint would check ship location before allowing comments on star posts. This is a single hook — the WordPress comment system handles everything else.

### Content moderation

Player comments are user-generated content with the usual moderation concerns. WordPress has built-in tools for this — comment approval, blocklists, Akismet integration — but the specifics can be figured out when it becomes a problem. The location gate already eliminates drive-by spam; the remaining concern is what players choose to write once they're there.

## The Full Loop

1. Player arrives at an uncharted star.
2. AI generates a discovery narrative from everything known about the moment.
3. The star is published with the narrative as content and the current time as its publish date.
4. The star appears in the RSS discovery feed — the narrative is the feed content.
5. The player names the star and leaves the first comment in the guestbook.
6. Other players who visit later can read the story, see who's been there, and leave their own comments — but they have to fly there first.
7. Anyone subscribed to the star's comment feed sees new visitors arrive from their RSS reader, days away.
