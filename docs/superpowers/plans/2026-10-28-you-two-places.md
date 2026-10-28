# "You Two" Places Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A shared map of meaningful places on the You Two tab. You add places by Mapbox search or by dropping a pin, tap a pin to see its details plus the milestones and photos linked to it, and milestones and photos can each point to a place. There is no location tracking.

**Architecture:**
- **Pure logic** lives in `utils/places.ts`, checked with `tsx`: camera bounds, link lookups, the geocoding URL, and response parsing.
- **Places** are stored at `rooms/{roomId}/places/{id}`. A `usePlaces` hook listens, saves, and deletes (unlinking milestones and photos).
- **Shared map pieces** are used by the full Places screen and by an in-picker editor: `PlaceMap`, `PlaceSearch`, `PlaceForm` and `PlaceEditor`.
- **Links** are a `placeId` on milestones (already reserved) and on photos. Milestone gallery mirrors copy it.

**Tech Stack:** Expo SDK 54, React Native 0.81, expo-router 6, `@rnmapbox/maps` ^10.2.10 (already set up), Mapbox Geocoding API v6 over `fetch`, and Firebase RTDB (web SDK). There's no test runner. Pure helpers are checked with `npx tsx` scripts in the git-ignored `.superpowers/checks/`; everything else with `npx tsc --noEmit` and the device checklist in Task 8.

**Spec:** `docs/superpowers/specs/2026-10-28-you-two-places-design.md`

## Global Constraints

- **No location, ever:**
  - no `UserLocation`, no `expo-location` calls, no permission prompts;
  - no imports from `hooks/useLocation`, `useSmartLocationTracking` or `services/locationTask` in new code;
  - the old `Home/Map.tsx` and `Zones.tsx` are untouched.
- **Data:**
  - Path: `rooms/{roomId}/places/{id}`, with ids from `newId()`.
  - The `Place` type is exactly as in the spec §1.
  - `Photo.placeId?: string`; `Milestone.placeId` already exists.
  - RTDB has no `undefined`; use `null` only in `update` to clear.
- **Geocoding:**
  - Endpoint: `GET https://api.mapbox.com/search/geocode/v6/forward?q={q}&limit=5&proximity={p}&access_token={MAPBOX_ACCESS_TOKEN}`.
  - `{p}` is `"{lng},{lat}"` of the map center when there's at least one pin or the user has moved the map. Otherwise it's `ip`. **Never** add a `country` filter.
  - Query after 300 ms of no typing, only for ≥ 3 characters.
  - The token comes from `config/mapboxConfig.ts`.
- **Map:**
  - `styleURL` is `MapboxGL.StyleURL.Dark` in dark mode, `MapboxGL.StyleURL.Street` otherwise.
  - Call `MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN)` once, in `PlaceMap`.
  - The empty default view is center `[0, 20]`, zoom `1`.
  - With one pin: zoom `13`.
  - With several pins: fit bounds, padding `60`.
- **Pin emojis:** `📍 👋 💕 🍽️ ☕ 🏠 ✈️ 🏖️ 🎉 💍 🌳 ⭐`. The default is `📍`.
- **Routes:**
  - The full map is `app/(tabs)/YouTwo/Places.tsx`.
  - Add `'/YouTwo/Places'` to `TAB_HIDDEN_ROUTES`.
  - Push with `as Href` casts, like the existing ones.
  - Params:
    - `Places?focus={placeId}` opens the map centered on that place with its card open.
    - `YouTwo?milestone={milestoneId}` opens that milestone's modal.
- **Saving:** check `isConnected()` first. When offline, toast "You're offline" and keep the form.
- **Type errors:** `npx tsc --noEmit` reports **45 errors** on `main`. Don't add any.
- **Commits:** messages end with a blank line, then `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A location permission prompt appearing anywhere** (for example, Mapbox showing the user's location by default). Expected: never. Task 4 must not render `UserLocation`, and Task 8 checks for it on a fresh install.
2. **Deleting a place that milestones and photos point to.** Expected: they all survive with `placeId` cleared, including the milestone mirror (`ms-…`) photos. Owned by Task 2; pinned by `unlinkUpdates` in Task 1.
3. **Search failing** (no network, a bad token, an empty result). Expected: a gentle message, and dropping a pin still works. Owned by Task 4; parse robustness is pinned in Task 1.
4. **Places on both sides of the antimeridian** (Fiji and Hawaii). Expected: bounds stay valid (min/max clamp); no crash. Pinned in Task 1.
5. **Opening the map from a deep link to a place that was just deleted** (`focus` points to a missing id). Expected: the normal fit-all view, with no card. Owned by Task 5.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `types/Place.ts`, `types/Photo.ts`, `types/index.ts` | Create, modify | `Place`, `PlaceObject`; `Photo.placeId` |
| `utils/places.ts`, `utils/photos.ts`, `utils/index.ts` | Create, modify | Pure place logic; mirror copies `placeId` |
| `hooks/useFirebase.tsx` | Modify | Place listen/set/delete; multi-path unlink |
| `hooks/usePlaces.tsx`, `hooks/index.ts` | Create, modify | Places state, save, delete with unlink |
| `hooks/useMilestones.tsx`, `hooks/useGallery.tsx` | Modify | `placeId` on milestone input, photo add, and photo edit |
| `components/PlaceMap/`, `PlaceSearch/`, `PlaceForm/`, `PlaceEditor/`, `PlaceCard/`, `PlacePicker/`, `PlacesPreview/` | Create | UI |
| `app/(tabs)/YouTwo/Places.tsx`, `app/(tabs)/YouTwo/index.tsx`, `constants/index.ts` | Create, modify | Screens and route |
| `components/MilestoneModal`, `PhotoAddSheet`, `PhotoViewer` | Modify | Place rows |

---

### Task 1: Types and pure place logic

**Files:**
- Create: `types/Place.ts`, `utils/places.ts`
- Modify: `types/Photo.ts`, `types/index.ts`, `utils/photos.ts` (`milestoneMirrorFields`), `utils/index.ts`
- Check: `.superpowers/checks/places.check.ts`

**Interfaces:**
- Produces (`types/Place.ts`): `interface Place { id; name; emoji; latitude; longitude; venue?; day?; note?; createdAt; createdBy; updatedAt? }` and `interface PlaceObject { [id: string]: Place }`.
- Produces (`types/Photo.ts`): `Photo.placeId?: string`.
- Produces (`utils/photos.ts`): `milestoneMirrorFields` now includes `placeId: m.placeId` when it's set. The key is absent otherwise. Its return type is unchanged.
- Produces (`utils/places.ts`, pure):
  - `type CameraView = { kind: 'world' } | { kind: 'center'; center: [number, number]; zoom: number } | { kind: 'bounds'; ne: [number, number]; sw: [number, number] }`
  - `cameraFor(places: Place[]): CameraView`. No places gives `world`. One place gives `center` at `[lng, lat]`, zoom `13`. Several give `bounds`, where `ne` = `[max lng, max lat]` and `sw` = `[min lng, min lat]`.
  - `linkedTo(placeId: string, milestones: Milestone[], photos: Photo[]): { milestones: Milestone[]; photos: Photo[] }`. Photos with a `milestoneId` are excluded from `photos`, because the milestone already represents them.
  - `unlinkUpdates(placeId: string, milestones: Milestone[], photos: Photo[], roomId: string): Record<string, null>`. A multi-path update object, e.g. `{ 'rooms/r/milestones/m1/placeId': null, 'rooms/r/photos/p1/placeId': null }`, for every milestone and photo (including `ms-` mirrors) pointing at `placeId`.
  - `type PlaceSuggestion = { name: string; address: string; latitude: number; longitude: number }`
  - `geocodeUrl(query: string, proximity: [number, number] | 'ip', token: string): string`. The query is `encodeURIComponent`'d; proximity formats as `"lng,lat"` or `"ip"`; params as in Global Constraints.
  - `parseGeocode(json: unknown): PlaceSuggestion[]`. Reads `features[]` → `properties.name`, `properties.full_address ?? properties.place_formatted ?? ''`, and `geometry.coordinates` `[lng, lat]`. It skips malformed features, and returns `[]` for anything unexpected (never throws).

- [ ] **Step 1: Write the check script** `.superpowers/checks/places.check.ts`:
  - `cameraFor([])` → `{ kind: 'world' }`; one place at lat 9.93, lng −84.08 → `{ kind: 'center', center: [-84.08, 9.93], zoom: 13 }`.
  - Three places → `bounds`, with `ne` = `[max lng, max lat]` and `sw` = `[min lng, min lat]`. For Fiji (178.4, −18.1) and Hawaii (−157.8, 21.3), `sw[0] <= ne[0]` and every value is finite.
  - `linkedTo('p1', …)` returns milestones with `placeId 'p1'`, and excludes a photo `{ placeId: 'p1', milestoneId: 'm1' }`.
  - `unlinkUpdates('p1', [m{id:'m1',placeId:'p1'}, m{id:'m2'}], [ph{id:'ms-m1',placeId:'p1'}, ph{id:'x',placeId:'p2'}], 'r')` → exactly `{ 'rooms/r/milestones/m1/placeId': null, 'rooms/r/photos/ms-m1/placeId': null }`.
  - `geocodeUrl('Café Central', 'ip', 'T')` contains `q=Caf%C3%A9%20Central`, `proximity=ip`, `limit=5` and `access_token=T`, and does not contain `country=`. With `[-84.08, 9.93]` it contains `proximity=-84.08%2C9.93` or `proximity=-84.08,9.93`.
  - `parseGeocode({ features: [{ properties: { name: 'La Terrazza', full_address: 'San José, CR' }, geometry: { coordinates: [-84.1, 9.9] } }, { bad: true }] })` → one suggestion. `parseGeocode(null)` → `[]`; `parseGeocode({ message: 'Not Authorized' })` → `[]`.
  - `milestoneMirrorFields({ …photo, placeId: 'p1' })` has `placeId: 'p1'`. Without `placeId`, `'placeId' in r === false`.
- [ ] **Step 2: Run it and watch it fail.** Run `npx tsx .superpowers/checks/places.check.ts`. Expected: module not found.
- [ ] **Step 3: Implement the types, `utils/places.ts` and the mirror change.** Export them from `types/index.ts` and `utils/index.ts`.
- [ ] **Step 4: Run it and watch it pass.** Expected: `places: all checks passed`. The `photos` and `milestones` checks still pass.
- [ ] **Step 5: Type-check.** Expected: `45`.
- [ ] **Step 6: Commit** `feat(places): place types and pure place logic`.

---

### Task 2: Storage and the `usePlaces` hook

**Files:**
- Modify: `hooks/useFirebase.tsx`
- Create: `hooks/usePlaces.tsx`; modify `hooks/index.ts`

**Interfaces:**
- Consumes: `Place`, `PlaceObject`, `unlinkUpdates` (Task 1); `listenToMilestoneChanges`, `listenToPhotoChanges`, `isConnected`, `newId` (existing).
- Produces (`useFirebase()`):
  - `listenToPlaceChanges(cb: (places: PlaceObject) => void, roomId: string): () => void`, which reports `{}` when empty.
  - `setPlace(roomId: string, place: Place): Promise<void>`
  - `deletePlaceRecord(roomId: string, id: string): Promise<void>`
  - `applyUpdates(updates: Record<string, unknown>): Promise<void>`, which calls `update(databaseRef(db), updates)` at the root.
- Produces: `usePlaces(): { places: Place[]; byId: PlaceObject; loading: boolean; savePlace(input: PlaceInput): Promise<Place | null>; removePlace(p: Place): Promise<boolean> }`
  - `type PlaceInput = { id?: string; name: string; emoji: string; latitude: number; longitude: number; venue?: string; day?: string; note?: string }`, exported.
  - `places` is sorted by `name`.
  - `savePlace`:
    - Checks `isConnected()` first; offline, it toasts and returns `null`.
    - Keeps `createdAt`/`createdBy` on edit and sets `updatedAt`.
    - Trims text, and omits empty optional fields.
    - Returns the saved `Place`. On failure it toasts and returns `null`.
  - `removePlace`:
    - Builds `unlinkUpdates(p.id, milestones, photos, roomId)` from the current listener data, sets `[`rooms/${roomId}/places/${p.id}`]: null` in the same object, and calls `applyUpdates` **once**, so the delete and the unlinks are atomic.
    - Toasts and returns `false` on failure.
  - The hook listens to places, milestones and photos.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Type-check.** Expected: `45`.
- [ ] **Step 3: Commit** `feat(places): place storage and hook with atomic unlink on delete`.

---

### Task 3: `placeId` on milestones and photos (data flows)

**Files:**
- Modify: `hooks/useMilestones.tsx`, `hooks/useGallery.tsx`

**Interfaces:**
- Consumes: `milestoneMirrorFields` with `placeId` (Task 1).
- Produces:
  - `MilestoneInput` gains `placeId?: string | null`. `undefined` keeps the existing value, `null` clears it, and a string sets it.
  - In `useGallery`:
    - `PendingPhoto` gains `placeId?: string`.
    - `addPhotos(items, shared: { tags: string[]; label?: string; placeId?: string }, …)`. An item's own `placeId` wins over `shared.placeId`.
    - `PhotoDetails` gains `placeId?: string | null`, and `updateDetails` writes `placeId: value ?? null`.

`useMilestones.saveMilestone`:
- The milestone's `placeId` is `input.placeId === undefined ? previous?.placeId : input.placeId || undefined`, with the key omitted when falsy.
- Mirror sync: when the milestone has a photo, the mirror `update` includes `placeId: milestone.placeId ?? null`, so clearing a milestone's place clears its mirror's place. Add the `?? null` at the call site; `milestoneMirrorFields` itself stays pure and omits the key.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Run the checks and type-check.** All three `tsx` checks pass; tsc gives `45`.
- [ ] **Step 3: Commit** `feat(places): place links on milestones and photos`.

---

### Task 4: Shared map pieces: `PlaceMap`, `PlaceSearch`, `PlaceForm`, `PlaceEditor`

**Files:**
- Create: `components/PlaceMap/`, `components/PlaceSearch/`, `components/PlaceForm/`, `components/PlaceEditor/` (each with `index.ts`); modify `components/index.ts`

**Interfaces:**
- Consumes: `cameraFor`, `geocodeUrl`, `parseGeocode`, `PlaceSuggestion` (Task 1); `usePlaces().savePlace`, `PlaceInput` (Task 2); `MAPBOX_ACCESS_TOKEN`.
- Produces:
  - `PlaceMap({ places, selectedId, draft, style, interactive, focus, onPinPress, onLongPress, onCenterChange }: { places: Place[]; selectedId?: string | null; draft?: { latitude: number; longitude: number } | null; style?: ViewStyle; interactive?: boolean; focus?: [number, number] | null; onPinPress?: (p: Place) => void; onLongPress?: (coord: [number, number]) => void; onCenterChange?: (center: [number, number], moved: boolean) => void })`
    - A `MapboxGL.MapView` with no `UserLocation`.
    - Camera: from `focus` when set (zoom 15), otherwise from `cameraFor(places)`.
    - Pins are `MapboxGL.MarkerView`s showing the emoji in a 36 px `primary` circle with a white border; the selected pin is 44 px.
    - `draft` renders a hollow pin.
    - `onLongPress` comes from `MapView.onLongPress` feature coordinates.
    - `onCenterChange` fires from `onCameraChanged`/`onMapIdle`. `moved` is true after a user gesture.
    - `interactive={false}` disables scroll, zoom, rotate and pitch (for the preview).
  - `PlaceSearch({ proximity, onPick }: { proximity: [number, number] | 'ip'; onPick: (s: PlaceSuggestion) => void })`
    - A text input with debounced (300 ms, ≥ 3 chars) `fetch(geocodeUrl(…))` → `parseGeocode`, showing up to 5 rows (name + address).
    - On a fetch error or `[]`, show "Couldn't find that. Try dropping a pin instead." Never throw.
    - Abort stale requests (`AbortController`).
  - `PlaceForm({ value, onChange }: { value: PlaceInput; onChange: (v: PlaceInput) => void })`: name (required), the emoji grid (Global Constraints), venue, an optional date (`DateTimePicker` with a "Clear" link), and note.
  - `PlaceEditor({ initial, places, onSaved, onCancel, mapHeight }: { initial: Partial<PlaceInput> & { latitude?: number; longitude?: number }; places: Place[]; onSaved: (p: Place) => void; onCancel: () => void; mapHeight: number })`
    - Combines `PlaceSearch` on top, then `PlaceMap` (`mapHeight` tall, with a draft pin; long-press moves the draft), then `PlaceForm`, then Save/Cancel.
    - Picking a search result moves the map (`focus`) and the draft there, and prefills `venue = name`. It also sets `name = name` if the name is empty.
    - Save is disabled without a name or a draft location. It calls `savePlace` → `onSaved`.
    - Proximity is the map center once a pin exists or the user moved the map; otherwise `'ip'`.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Type-check.** Expected: `45`. Run `grep -rn "UserLocation\|useLocation\|expo-location" components/Place*` and expect no output.
- [ ] **Step 3: Commit** `feat(places): shared map, search, form and editor components`.

---

### Task 5: Full Places screen and pin card

**Files:**
- Create: `app/(tabs)/YouTwo/Places.tsx`, `components/PlaceCard/` (+ `index.ts`)
- Modify: `components/index.ts`, `constants/index.ts` (`'/YouTwo/Places'`)

**Interfaces:**
- Consumes: Tasks 2 and 4; `linkedTo` (Task 1); `useMilestones().milestones`, `useGallery()` (`photos`, `updateDetails`, `removePhoto`, `tags`); `PhotoViewer`.
- Produces: `PlaceCard({ place, milestones, photos, onEdit, onDelete, onMilestonePress, onPhotoPress, onClose }: { place: Place; milestones: Milestone[]; photos: Photo[]; onEdit: () => void; onDelete: () => void; onMilestonePress: (m: Milestone) => void; onPhotoPress: (index: number) => void; onClose: () => void })`. It's a bottom sheet (an absolutely positioned view over the map, not a modal) with:
  - the emoji and name;
  - the venue and date ("Jul 8, 2023");
  - the note;
  - milestone chips;
  - photo thumbnails (`thumbUrl ?? url`, 56 px);
  - Edit and Delete.

**Screen:**
- A header with back, the title "Our places", and "+ Add" (opens the editor with a draft at the current map center).
- `PlaceSearch` under the header. Picking a result opens the editor prefilled.
- A full-height `PlaceMap`:
  - long-press opens the editor with the draft there;
  - a pin press selects it and shows its `PlaceCard`.
- The editor shows as a modal sheet containing `PlaceEditor` (`mapHeight` 220).
- With no places, a hint card: "Search for a place or long-press the map to drop a pin".
- **`focus` param:** if it names an existing place, center on it and open its card. Otherwise ignore it (Review Focus 5).
- **Delete:** `Alert.alert('Delete place?', 'Milestones and photos stay, they just won't have a place.', …)` → `removePlace`.
- **Milestone chip:** `router.push({ pathname: '/(tabs)/YouTwo', params: { milestone: m.id } } as unknown as Href)`.
- **Photo thumbnail:** `PhotoViewer` over the place's photos.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Type-check.** Expected: `45`.
- [ ] **Step 3: Commit** `feat(places): full places map with pin cards`.

---

### Task 6: Places card on You Two, and opening a milestone from a link

**Files:**
- Create: `components/PlacesPreview/` (+ `index.ts`); modify `components/index.ts`
- Modify: `app/(tabs)/YouTwo/index.tsx`

**Interfaces:**
- Consumes: `usePlaces()` (Task 2), `PlaceMap` (Task 4).
- Produces: `PlacesPreview({ places, onOpen }: { places: Place[]; onOpen: () => void })`
  - A section title "Places" plus "Open map ›".
  - A 140 px rounded `PlaceMap` with `interactive={false}`, wrapped in a pressable that calls `onOpen`.
  - With no places, an "Add your first place" tile that calls `onOpen`.

**You Two screen:**
- Insert `PlacesPreview` between `PhotoStrip` and "Our story". `onOpen` pushes `/(tabs)/YouTwo/Places`.
- Read `useLocalSearchParams<{ milestone?: string }>()`. Once `milestones` has loaded and contains that id, open `MilestoneModal` on it, then clear the param (`router.setParams({ milestone: undefined })`) so it doesn't reopen.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Type-check.** Expected: `45`.
- [ ] **Step 3: Commit** `feat(places): places card on the You Two tab`.

---

### Task 7: Place picker, and place rows in the milestone, photo-add and viewer forms

**Files:**
- Create: `components/PlacePicker/` (+ `index.ts`); modify `components/index.ts`
- Modify: `components/MilestoneModal/MilestoneModal.tsx`, `components/PhotoAddSheet/PhotoAddSheet.tsx`, `components/PhotoViewer/PhotoViewer.tsx`, plus their callers in `app/(tabs)/YouTwo/index.tsx` and `Photos.tsx`

**Interfaces:**
- Consumes: `usePlaces()` (Task 2), `PlaceEditor` (Task 4), and the Task 3 inputs.
- Produces:
  - `PlacePicker({ isOpen, places, selectedId, onSelect, onClose }: { isOpen: boolean; places: Place[]; selectedId?: string | null; onSelect: (placeId: string | null) => void; onClose: () => void })`
    - A modal with a filter input over the saved places (by name or venue), the rows "No place" and "+ New place", and then the places.
    - "+ New place" swaps the modal's content to `PlaceEditor` (`mapHeight` 220). `onSaved` → `onSelect(place.id)` and close.
    - It doesn't navigate.
  - `PlaceRow({ place, onPress, disabled }: { place?: Place; onPress: () => void; disabled?: boolean })`, exported from the same folder. It shows "📍 Place" with the place's emoji and name, or "Add a place".

**Forms:**
- **`MilestoneModal`:** a "Place" `PlaceRow` after Date, which opens `PlacePicker`. It sends `placeId` on save (`null` when cleared, the string when set). It needs a new prop `places: Place[]`, passed from the You Two screen.
- **`PhotoAddSheet`:**
  - Single photo: a "Place" row, setting the item's `placeId`.
  - Bulk: a "Place for all" row (passed as `shared.placeId`), plus a "Place" row inside the per-photo editor.
  - New prop `places: Place[]`.
- **`PhotoViewer`:**
  - Details show `📍 {name}` when the photo has a place. Tapping it calls `onPlacePress(placeId)`, where the caller pushes `Places?focus=…`.
  - In edit, a `PlaceRow` that's disabled on milestone mirrors (its place follows the milestone). It saves `placeId` through `PhotoDetails`.
  - New props `places: Place[]` and `onPlacePress?: (id: string) => void`.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Run the checks and type-check.** All three `tsx` checks pass; tsc gives `45`.
- [ ] **Step 3: Commit** `feat(places): place picker and place links in milestone and photo forms`.

---

### Task 8: Final checks and device checklist

- [ ] **Step 1: Run the checks.**
  - `grep -rn "UserLocation\|requestForegroundPermissions\|requestBackgroundPermissions\|expo-location" components app/\(tabs\)/YouTwo hooks/usePlaces.tsx utils/places.ts`. Expected: no output.
  - All three `tsx` checks pass.
  - tsc gives `45`.
- [ ] **Step 2: Hand the device checklist to the user** (spec, Verification). It needs the rebuilt dev client and real accounts.
  1. Fresh install, then open You Two and the Places map. **No location permission prompt, ever.** With no places, the map shows the wide world view and the hint.
  2. Search for a café near you, pick a result, name it and save. The pin appears on the map and in the card preview, and local results come first.
  3. Long-press to drop a pin, then add it. Edit it and move the pin.
  4. Give a milestone a place (including "+ New place" from inside the milestone form, which keeps the form's contents). Bulk-add two photos with "Place for all". The pin's card shows them; tapping a photo opens the viewer, and tapping the milestone chip opens that milestone.
  5. Delete the place. The milestone and photos remain with no place, including the milestone's gallery photo.
  6. The partner's phone sees places live.
