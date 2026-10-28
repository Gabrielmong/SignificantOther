# "You Two" Places

## Goal

Add a map of the places that matter to the couple ("we met here", "our
first date") to the You Two tab. Either partner can add a place by
searching for it by name or by dropping a pin. Tapping a pin brings back
the memory: its name, date and note, plus the milestones and photos
linked to it. Milestones and gallery photos can each point to a place.
**There is no location tracking of any kind.**

## Why

"You Two" is where the couple looks back together. Milestones capture
*when* and the gallery captures *what it looked like*; Places captures
*where*. This is the third piece of the feature, after
`2026-10-28-you-two-tab-design.md` (header, counter, milestones) and
`2026-10-28-you-two-gallery-design.md` (gallery), both merged. The fourth
piece (Timeline + On this day) comes later.

## Decisions made during brainstorming

- **What it's for:** pins you tap to remember. No routes, no stats, no
  live location.
- **Adding a place:** **both** typing a name to search for it **and**
  dropping a pin on the map.
- **Where it lives (option A, from mockups):** a **"Places" card on the
  You Two tab**, with a small map preview and "Open map ›", between
  Photos and Our story. It opens a full-screen map.
- **Tapped pin:** a card with the place's details and the milestones and
  photos linked to it.
- **Photos can have a place,** and so can milestones (as planned in piece
  1).

## Current state (what the builder starts from)

- **Mapbox:**
  - `@rnmapbox/maps` ^10.2.10 is installed and configured; the plugin is
    in `app.config.ts`.
  - The token is `MAPBOX_ACCESS_TOKEN` from `config/mapboxConfig.ts`
    (Expo `extra.mapboxAccessToken`, from `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`).
  - `app/(tabs)/Home/Map.tsx` shows the patterns to reuse:
    `MapboxGL.setAccessToken`, `MapView` with the dark/street style by
    color mode, `Camera`, and `PointAnnotation` pins with custom views.
  - Image pins need the `annotationRef.refresh()` on image load trick.
  - `components/AddZoneModal/AddZoneModal.tsx` has a tap-to-pick-location
    map; its fallback center is San Francisco.
- **The old Map screen** (`Home/Map.tsx`, live-location tracking) is
  unlinked from Home and **stays untouched and unlinked**. Background
  location tracking is not running (its start-up code is commented out,
  and its permission requests return `false`).
- **You Two tab:** `app/(tabs)/YouTwo/index.tsx` renders the header, then
  `PhotoStrip`, then "Our story" (milestones). The gallery is
  `app/(tabs)/YouTwo/Photos.tsx`, which hides the tab bar through
  `TAB_HIDDEN_ROUTES` in `constants/index.ts`, and is navigated to with
  `router.push('/(tabs)/YouTwo/Photos' as Href)`.
- **Milestones** (`types/Milestone.ts`) already reserve
  `placeId?: string`, and `saveMilestone` preserves an existing `placeId`.
  They're edited in `components/MilestoneModal/MilestoneModal.tsx`, saved
  by `hooks/useMilestones.tsx`, and stored at
  `rooms/{roomId}/milestones/{id}`.
- **Photos** (`types/Photo.ts`) are stored at `rooms/{roomId}/photos/{id}`.
  - They're added with `components/PhotoAddSheet` and edited in
    `components/PhotoViewer`.
  - The `useGallery` flows are `addPhotos(items, shared, onProgress)` and
    `updateDetails(id, PhotoDetails)`, with
    `PhotoDetails = { label?, description?, day, tags }`.
  - Milestone photos are mirrored as `ms-{milestoneId}` gallery entries.
- **Conventions:**
  - `newId()`, `set`/`update`/listen functions in `hooks/useFirebase.tsx`
    (listeners report empty lists), and no `undefined` values in RTDB.
  - `isConnected()` is checked before saving.
  - Pure logic goes in `utils/` and is checked with `npx tsx` scripts in
    the git-ignored `.superpowers/checks/`.
  - There is no test runner. The `npx tsc --noEmit` baseline is 45 errors
    and must not grow.
  - Firebase rules are the defaults.

## Components

### 1. Data

Places live at `rooms/{roomId}/places/{id}`:

```ts
type Place = {
  id: string;
  name: string;          // "Our first date" (required)
  emoji: string;         // shown on the pin
  latitude: number;
  longitude: number;
  venue?: string;        // "La Terrazza, San José" (from search, editable)
  day?: string;          // "YYYY-MM-DD", optional
  note?: string;
  createdAt: number;
  createdBy: string;
  updatedAt?: number;
};
```

- `Photo` gains `placeId?: string`. `Milestone.placeId` already exists.
- **Links point from milestones and photos to places, not the other
  way.** A pin's card finds its milestones and photos by filtering on
  `placeId`.
- **Deleting a place** *(Claude's call)*: ask for confirmation, then
  remove the place and clear `placeId` from every milestone and photo
  that points to it, using `update` with `null`. The milestones and
  photos themselves stay.
- **Milestone photo mirrors:** a milestone's place carries over to its
  `ms-{id}` gallery entry, like its label and date. `milestoneMirrorFields`
  includes `placeId` when the milestone has one. When the milestone loses
  its place, the mirror's `placeId` is cleared.

### 2. Finding a place by name

*(Claude's call on mechanism.)*

- Use Mapbox's forward geocoding over HTTP (the Geocoding API v6
  `forward` endpoint, or the Search Box API), with the existing
  `MAPBOX_ACCESS_TOKEN`. No new dependency.
- **Results:**
  - Query as the user types, debounced (~300 ms) and only from 3
    characters on.
  - Ask for up to 5 results. Results **prefer local places but are never
    limited to one country** (decided by the user: "prefer local results,
    but we could add from other countries"). So use the `proximity` bias,
    never a `country` filter:
    - When the map shows real places (at least one pin, or the user has
      moved the map away from the default world view), use
      `proximity=<map center lng,lat>`.
    - Otherwise (no pins, default view), use `proximity=ip`. Mapbox
      biases toward the rough area of the internet connection. No
      permission prompt, and nothing is stored or sent to Firebase.
      This is the only place the app infers location at all.
  - Show each as a name with a short address line.
- Picking a result moves the map there and starts the add form with the
  venue name and coordinates filled in. The user still gives the place
  its own name ("Our first date"), which defaults to the venue name.
- If the search fails or comes back empty, show a gentle message
  suggesting dropping a pin instead. Never block adding.

### 3. The full map screen

- **Route:** `app/(tabs)/YouTwo/Places.tsx`, with the tab bar hidden
  (`'/YouTwo/Places'` in `TAB_HIDDEN_ROUTES`) and a back button.
- **Map:**
  - `MapView` with the dark style in dark mode and the street style in
    light mode, as in `Home/Map.tsx`.
  - No `UserLocation`, no location permission, and no "locate me"
    button.
- **Camera:**
  - On open, fit all pins with padding.
  - With one pin, center on it at about zoom 13.
  - With no pins, show a wide default view *(Claude's call: the whole
    world at low zoom)* and the hint "Search for a place or long-press
    the map to drop a pin".
- **Pins:** each place is a marker showing its emoji in an accent-colored
  teardrop or circle. They're always visible.
- **Search bar** at the top (§2).
- **Dropping a pin** *(Claude's call)*: long-press anywhere on the map
  starts the add form at that point. "+ Add" in the header puts a pin at
  the map's center instead.
- **Tapping a pin** opens a bottom sheet:
  - the emoji and name, the venue and date, and the note;
  - linked milestones as chips (emoji + title). Tapping one *(Claude's
    call, builder-check follow-up)* navigates to the You Two tab with a
    route parameter `milestone={id}`, and the You Two screen opens that
    milestone in its `MilestoneModal`. This works the same from any
    entry point (the card, the photo viewer's "📍 place" link, or the
    gallery);
  - linked photos as a row of thumbnails, where tapping one opens the
    existing `PhotoViewer` over those photos;
  - Edit and Delete.

### 4. Add / edit place form

A sheet with these fields:
- name (required);
- an emoji grid (Claude's set: 📍 👋 💕 🍽️ ☕ 🏠 ✈️ 🏖️ 🎉 💍 🌳 ⭐);
- venue (optional, prefilled from search);
- date (optional);
- note (optional).

The location comes from the search result or the dropped or centered
pin. While editing, the user can move it by dragging the pin, or by
tapping "Move pin" and long-pressing a new spot *(builder picks one)*.

- Saving checks `isConnected()` first, refusing with "You're offline"
  when there's no connection.
- On failure, show an error toast and keep the form's contents.

### 5. The "Places" card on You Two

- It sits between the Photos strip and "Our story": a section title
  "Places" plus "Open map ›", then a small non-interactive map preview
  (about 140 px tall, rounded) with all pins fitted. Tapping the preview
  opens the full map.
- With no places, show an "Add your first place" tile that opens the full
  map.

### 6. Linking milestones and photos to a place

- **A shared place picker** (sheet): search your saved places by name,
  plus "No place" and "+ New place".
  - **"+ New place" adds the place right inside the picker** *(Claude's
    call, builder-check follow-up)*. It does not go to the map screen.
    The milestone form and the photo add sheet are modals, and leaving
    them would lose a half-filled milestone or the photos picked for
    upload.
  - The picker swaps to a compact add view: the same search bar (§2),
    a small map (about 220 px) where long-press drops the pin, and the
    add form fields (§4).
  - Saving creates the place and selects it.
  - Build the search bar, mini map and form as shared pieces
    (e.g. a `PlaceEditor`) that the full map screen also uses.
- **Milestone form** (`MilestoneModal`): an optional "Place" row showing
  the chosen place's emoji and name, which opens the picker. Saved as the
  milestone's `placeId`.
- **Photo add sheet:**
  - Single photo: a "Place" row.
  - Bulk: "Place for all" (optional), and a photo's own place wins over
    it.
  - `addPhotos` accepts `shared.placeId` and a per-item `placeId`.
- **Photo viewer edit:** a "Place" row, and `PhotoDetails` gains
  `placeId?: string | null`. On milestone mirrors the place follows the
  milestone, so the row is read-only there.
- **Display:**
  - The viewer's details show "📍 {place name}"; tapping it opens the full
    map focused on that place.
  - Milestone rows don't change. *(Claude's call: keep them compact.)*

## Non-goals

- Any live, background or one-time device location: no "you are here",
  no permission prompts, no tracking. The only inference is Mapbox's
  `proximity=ip` search bias described in §2. The old Map/Zones screens stay as they
  are, unlinked.
- Reading GPS from photos' EXIF to suggest places (a possible later
  addition).
- Routes, distances, travel stats, clustering, heatmaps.
- Offline maps.
- Changes to Home.

## Anti-goals

*(Claude's call)*

- **Asking for location permission** or appearing to track anyone, which
  would contradict the couple's explicit "no tracking".
- **Deleting a place destroys memories.** Milestones and photos must
  survive it; only the link goes.
- **A map that opens on an empty ocean** or the wrong continent when
  places exist.
- **Search that blocks adding** when Mapbox is unreachable. Dropping a
  pin must always work.

## Verification

Run `npx tsc --noEmit` (no new errors) and `tsx` checks for the pure
logic:

- the camera bounds from places (none, one, many, including across the
  antimeridian, which can be clamped simply);
- filtering milestones and photos by `placeId`;
- the mirror carrying `placeId`;
- building the geocoding URL and parsing its response into results.

Then on a device:

1. With no places, the card shows "Add your first place", the map opens
   on the wide view, and **no location permission prompt appears, ever**.
2. Search "a café near you", pick a result, name it, and save: the pin
   appears, and so does the card preview.
3. Long-press to drop a pin, then add it. Edit it and move it.
4. Link a milestone and two photos (one bulk-added with "Place for all").
   The pin's card shows them; tapping a photo opens the viewer.
5. Delete the place: the milestone and photos remain, with no place.
6. The partner's phone sees places live.

## Left to the builder

- Component split and file names.
- The marker visuals within the theme (emoji in an accent pin).
- Whether moving a pin uses drag or "Move pin" + long-press.
- The exact geocoding endpoint (v6 forward or Search Box) and the
  response mapping.
- The map style URLs, reusing what `Home/Map.tsx` uses.
