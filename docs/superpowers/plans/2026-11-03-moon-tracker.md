# Moon Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A compact Home card showing tonight's moon (from real photos) with a countdown to the partner's favorite phase, a slider modal to set your own favorite, and a Moon screen listing the next 12 months of full moons, supermoons, blue moons and lunar eclipses (blood moons).

**Architecture:**
- **Assets:** a one-off script turns the 28 pink-background JPGs into transparent PNGs in `assets/moon/`, required through `constants/moonPhases.ts`.
- **Pure logic** lives in `utils/moon.ts` on top of `astronomy-engine`, checked with a `tsx` script.
- **Data:** each partner's favorite is a number (degrees) at `rooms/{roomId}/users/{uid}/favoriteMoonPhase`, read and written by two new `useFirebase` functions and wrapped in `hooks/useMoon.tsx`.
- **UI:** `MoonImage`, `PhaseSlider`, `MoonPhaseModal`, `MoonCard`, and a new `app/(tabs)/Home/Moon.tsx` screen.

**Tech Stack:** Expo SDK 54, React Native 0.81, expo-router 6, `astronomy-engine` (new, pure JS), `react-native-gesture-handler` ~2.28 and `react-native-reanimated` ~4.1 (already installed), `expo-image`, Firebase RTDB (web SDK) through `hooks/useFirebase.tsx`, and `jimp-compact` (already in node_modules) for the asset script. There's no test runner. Pure helpers are checked with `npx tsx` scripts in the git-ignored `.superpowers/checks/`; everything else with `npx tsc --noEmit` and the device checklist in Task 7.

**Spec:** `docs/superpowers/specs/2026-11-03-moon-tracker-design.md`

## Global Constraints

- **OTA-safe:** no new native dependency. The only new package is `astronomy-engine`. The app uses `runtimeVersion: { policy: 'fingerprint' }`, so this feature must ship via `eas update`.
- **No location:** no `expo-location`, `useLocation` or `useSmartLocationTracking` in new code.
- **Type errors:** `npx tsc --noEmit` reports **0 errors** on `main`. Keep it at 0.
- **Phase model:**
  - `PHASE_COUNT = 28`.
  - Image `i` ↔ angle `i * 360 / 28` degrees (0 = new, 180 = full).
  - Synodic month `29.530588` days.
- **Favorite storage:**
  - Path: `rooms/{roomId}/users/{uid}/favoriteMoonPhase`.
  - Value: a number of degrees, always one of the 28 snap angles.
  - Missing means "not set".
- **"Here tonight" window:** the current angle is within **±6°** of the favorite, wrapping around 360.
- **Phase names and emojis:**
  - new 🌑, waxing crescent 🌒, first quarter 🌓, waxing gibbous 🌔, full 🌕, waning gibbous 🌖, last quarter 🌗, waning crescent 🌘.
  - The four principal names apply within ±7.5° of 0/90/180/270. Otherwise use the intermediate name for that quadrant.
- **Events:**
  - Blood moon = total lunar eclipse.
  - Supermoon = a full moon with geocentric distance < **360,000 km**.
  - Blue moon = the second full moon in the same local calendar month.
  - The window is 12 months from now.
- **Images** are northern-hemisphere orientation. Never flip them.
- **Home card** height is `PRESSABLE_CARD_HEIGHT`, same as the Flower and Feeling cards. It goes right after the Feeling card's "Calendar →" link, before Daily Question.
- **Pill copy**, with `{p}` as the partner's name:
  - "{p}'s favorite is here tonight"
  - "{p}'s favorite is tomorrow"
  - "{p}'s favorite in N days"
  - When the partner hasn't set one: "{p} hasn't picked a favorite moon yet"

## Review Focus

- **Wrap-around at 360°/0°:** a favorite of 0° (new moon) while the current angle is 357° must count as "here tonight", and slider index 27 → 0 must not jump. Pinned in Task 2 (`angleDiff`, `favoriteStatus` cases).
- **"Here tonight" right after the exact moment:** the countdown should not say "in 29 days" while the window is still open. `isNow` wins over `days`. Pinned in Task 2.
- **Partner without a favorite, or no partner yet:** the card must still render the moon and show the "hasn't picked" copy, or no pill when there's no partner. Pinned in Task 5's device checklist items and Task 2's `countdownText(null)` case.
- **App left open across midnight or for hours:** the moon info and countdown must refresh on a 10-minute tick and when the app returns to the foreground. Pinned in Task 3's `useMoonNow`.
- **Days rounding:** 36 hours away shows "in 2 days", 20 hours away shows "tomorrow", never "in 0 days". Pinned in Task 2.

---

### Task 1: Transparent moon assets

**Files:**
- Create: `.superpowers/tools/moon-assets.cjs` (git-ignored, one-off)
- Create: `assets/moon/phase-00.png` … `assets/moon/phase-27.png`
- Create: `constants/moonPhases.ts`
- Modify: `constants/index.ts` (re-export)

**Interfaces:**
- Produces:
  - `MOON_PHASE_IMAGES: number[]`: 28 `require(...)` results, index = phase index.

- [ ] **Step 1: Write the script.**
  - Input: `C:\Users\gabri\Downloads\phases\james-greener-<i>-<n>.jpg`. Sort by the number after `james-greener-`, which is the index `i` (0–27).
  - For each image, using `jimp-compact`:
    1. Find the bounding box of pixels that are not background. The background is `(253,169,170)`; treat any pixel with distance > 40 from it as foreground.
    2. Crop to the square around that box's centre, side = max(width, height).
    3. Resize to 360×360.
    4. Set alpha to 0 outside a circle of radius 180 centred at (180,180). Feather alpha linearly over the last 1.5px for an anti-aliased edge.
    5. Write `assets/moon/phase-<ii>.png` (two-digit index).
  - Log each output path and its bounding box.
- [ ] **Step 2: Run it.** `node .superpowers/tools/moon-assets.cjs` writes 28 files. Bounding boxes all start at x≈176 and are ≈360 wide, per the builder check.
- [ ] **Step 3: Check visually.** Open `phase-00`, `07`, `14` and `21`. There's no pink fringe, the corners are transparent, and the dark side is kept as a full disc.
- [ ] **Step 4: Add `constants/moonPhases.ts`.** Export `MOON_PHASE_IMAGES` as an array literal of 28 static `require('../assets/moon/phase-XX.png')`. Re-export it from `constants/index.ts`.
- [ ] **Step 5: Type-check.** `npx tsc --noEmit` gives 0 errors.
- [ ] **Step 6: Commit** `assets/moon`, `constants/moonPhases.ts` and `constants/index.ts`: `feat(moon): add transparent moon phase images`.

### Task 2: `utils/moon.ts` astronomy helpers

**Files:**
- Modify: `package.json`, `package-lock.json` (`npx expo install astronomy-engine`)
- Create: `utils/moon.ts`
- Create: `.superpowers/checks/moon.check.ts`

**Interfaces:**
- Produces:
  ```ts
  export const PHASE_COUNT = 28;
  export type MoonPhaseName = 'new' | 'waxingCrescent' | 'firstQuarter' | 'waxingGibbous' | 'full' | 'waningGibbous' | 'lastQuarter' | 'waningCrescent';
  export const PHASE_LABELS: Record<MoonPhaseName, string>;   // 'New Moon', 'Waxing Crescent', … 'Full Moon' …
  export const PHASE_EMOJIS: Record<MoonPhaseName, string>;
  export const indexToAngle: (index: number) => number;        // i * 360/28
  export const angleToIndex: (angle: number) => number;        // nearest, 0..27, wraps
  export const angleDiff: (a: number, b: number) => number;    // smallest absolute difference, 0..180
  export const phaseName: (angle: number) => MoonPhaseName;
  export const illuminationAtAngle: (angle: number) => number; // (1 - cos(angle)) / 2, for the slider preview
  export type MoonInfo = { angle: number; illumination: number; ageDays: number; name: MoonPhaseName; imageIndex: number };
  export const getMoonInfo: (date: Date) => MoonInfo;
  export const nextPhaseTime: (angle: number, from: Date) => Date;
  export type FavoriteStatus = { isNow: boolean; next: Date; days: number };
  export const favoriteStatus: (favoriteAngle: number, now: Date) => FavoriteStatus;
  export const countdownText: (partnerName: string, status: FavoriteStatus | null) => string;
  export type LunarEvent = {
    date: Date;
    type: 'fullMoon' | 'eclipse';
    supermoon?: boolean;
    blueMoon?: boolean;
    eclipseKind?: 'penumbral' | 'partial' | 'total';
  };
  export const upcomingLunarEvents: (from: Date, months?: number) => LunarEvent[]; // default 12, sorted by date
  ```

- [ ] **Step 1: Install.** Run `npx expo install astronomy-engine`.
- [ ] **Step 2: Write the failing check `.superpowers/checks/moon.check.ts`.** Follow the style of `serial.check.ts`: `node:assert/strict` plus an async IIFE.
  ```ts
  // mapping + wrap
  assert.equal(indexToAngle(14), 180);
  assert.equal(angleToIndex(359), 0);
  assert.equal(angleToIndex(indexToAngle(27)), 27);
  assert.equal(angleDiff(357, 0), 3);
  assert.equal(angleDiff(10, 350), 20);
  // names
  assert.equal(phaseName(0), 'new');
  assert.equal(phaseName(180), 'full');
  assert.equal(phaseName(200), 'waningGibbous');
  assert.equal(phaseName(indexToAngle(21)), 'lastQuarter');
  assert.equal(phaseName(indexToAngle(1)), 'waxingCrescent');
  // known dates (UTC)
  const fullNov = nextPhaseTime(180, new Date('2026-11-03T00:00:00Z'));
  assert.equal(fullNov.toISOString().slice(0, 10), '2026-11-24');
  const info = getMoonInfo(fullNov);
  assert.ok(info.illumination > 0.99 && info.imageIndex === 14 && info.name === 'full');
  // favoriteStatus / countdownText
  const justAfter = new Date(fullNov.getTime() + 3 * 3600e3);
  assert.equal(favoriteStatus(180, justAfter).isNow, true);
  const in36h = new Date(fullNov.getTime() - 36 * 3600e3);
  assert.equal(favoriteStatus(180, in36h).days, 2);
  assert.equal(countdownText('Sam', favoriteStatus(180, in36h)), "Sam's favorite in 2 days");
  const in20h = new Date(fullNov.getTime() - 20 * 3600e3);
  assert.equal(countdownText('Sam', favoriteStatus(180, in20h)), "Sam's favorite is tomorrow");
  assert.equal(countdownText('Sam', favoriteStatus(180, justAfter)), "Sam's favorite is here tonight");
  assert.equal(countdownText('Sam', null), "Sam hasn't picked a favorite moon yet");
  // events across 2026
  const ev = upcomingLunarEvents(new Date('2026-01-01T00:00:00Z'));
  const eclipse = (d: string) => ev.find((e) => e.type === 'eclipse' && e.date.toISOString().startsWith(d));
  assert.equal(eclipse('2026-03-03')?.eclipseKind, 'total');
  assert.equal(eclipse('2026-08-28')?.eclipseKind, 'partial');
  assert.ok(ev.some((e) => e.blueMoon && e.date.toISOString().startsWith('2026-05-31')));
  assert.ok(ev.some((e) => e.supermoon && e.date.toISOString().startsWith('2026-12-24')));
  assert.ok(ev.every((e, i) => i === 0 || ev[i - 1].date <= e.date));
  assert.ok(ev.filter((e) => e.type === 'fullMoon').length >= 12);
  ```
- [ ] **Step 3: Run it to see it fail.** `npx tsx .superpowers/checks/moon.check.ts` fails on the missing module.
- [ ] **Step 4: Implement `utils/moon.ts`.**
  - `getMoonInfo`:
    - `angle` = `Astronomy.MoonPhase(date)`
    - `illumination` = `Astronomy.Illumination(Astronomy.Body.Moon, date).phase_fraction`
    - `ageDays` = `angle / 360 * 29.530588`
    - `imageIndex` = `angleToIndex(angle)`
  - `nextPhaseTime`: `Astronomy.SearchMoonPhase(angle, from, 40)!.date`.
  - `favoriteStatus`:
    - `isNow` = `angleDiff(MoonPhase(now), fav) <= 6`.
    - `next` = `nextPhaseTime(fav, now)`.
    - `days` = `Math.max(1, Math.round((next - now) / 86_400_000))`.
  - `countdownText`: `isNow` → "here tonight"; else `days === 1` → "is tomorrow"; else "in N days".
  - `upcomingLunarEvents`:
    - **Full moons:** chain `SearchMoonPhase(180, t, 40)` up to `from + months`.
    - **Supermoon:** `Astronomy.GeoMoon(date).Length() * Astronomy.KM_PER_AU < 360000`.
    - **Blue moon:** the previous full moon in the list (search one extra back from `from` so the first month is correct) has the same local `getFullYear()`/`getMonth()`.
    - **Eclipses:** `SearchLunarEclipse(from)` then `NextLunarEclipse(e.peak)` while `peak.date` is within the window. Map `kind` to `eclipseKind`.
    - Merge both lists and sort by date.
- [ ] **Step 5: Run the check.** It passes, and tsc gives 0 errors.
- [ ] **Step 6: Commit** `utils/moon.ts`, `package.json` and `package-lock.json`: `feat(moon): moon phase and lunar event helpers`.

### Task 3: Favorite storage and moon hooks

**Files:**
- Modify: `hooks/useFirebase.tsx`, next to `getFlower`/`updateFlower`, and add both to its returned object
- Create: `hooks/useMoon.tsx`
- Modify: `hooks/index.ts` (`export * from './useMoon';`)

**Interfaces:**
- Consumes: `getMoonInfo`, `favoriteStatus`, `MoonInfo`, `FavoriteStatus` from Task 2.
- Produces:
  ```ts
  // useFirebase()
  listenToFavoriteMoonPhase: (roomId: string, uid: string, cb: (angle: number | null) => void) => () => void;
  updateFavoriteMoonPhase: (roomId: string, uid: string, angle: number) => Promise<void>;
  // hooks/useMoon.tsx
  export const useMoonNow: () => { now: Date; moon: MoonInfo };
  export const useMoonFavorites: (p: { roomId: string | null; userId: string | null; partnerId: string | null }) => {
    myFavorite: number | null;
    partnerFavorite: number | null;
    saveFavorite: (angle: number) => Promise<void>;
  };
  ```

- [ ] **Step 1: Add the Firebase functions.**
  - `listenToFavoriteMoonPhase`: `onValue` on `rooms/${roomId}/users/${uid}/favoriteMoonPhase`. Call back with `typeof v === 'number' ? v : null`, and return the unsubscribe.
  - `updateFavoriteMoonPhase`: `set` on the same path.
- [ ] **Step 2: Implement `useMoonNow`.**
  - Keep `now` in state and recompute every 10 minutes with `setInterval`.
  - Also recompute on `AppState` `'active'`, like `useDailyQuestion`.
  - `moon` = `useMemo(() => getMoonInfo(now), [now])`.
- [ ] **Step 3: Implement `useMoonFavorites`.**
  - Subscribe for `userId` and `partnerId` when each one and `roomId` are non-empty, and clean up on change.
  - `saveFavorite` calls `updateFavoriteMoonPhase(roomId, userId, angle)`, but only with `roomId` and `userId` present.
  - Get the Firebase functions from `useFirebase()`.
- [ ] **Step 4: Type-check.** tsc gives 0 errors, and the Task 2 check still passes.
- [ ] **Step 5: Commit:** `feat(moon): sync favorite moon phase per partner`.

### Task 4: Moon image, phase slider and favorite modal

**Files:**
- Create: `components/MoonImage/MoonImage.tsx`, `components/MoonImage/index.ts`
- Create: `components/PhaseSlider/PhaseSlider.tsx`, `components/PhaseSlider/index.ts`
- Create: `components/MoonPhaseModal/MoonPhaseModal.tsx`, `components/MoonPhaseModal/index.ts`
- Modify: `components/index.ts` (export all three)

**Interfaces:**
- Consumes: `MOON_PHASE_IMAGES` (Task 1); `indexToAngle`, `angleToIndex`, `phaseName`, `PHASE_LABELS`, `PHASE_EMOJIS`, `illuminationAtAngle`, `PHASE_COUNT` (Task 2); `selectionFeedback`, `successFeedback` from `utils/haptics.ts`.
- Produces:
  ```ts
  <MoonImage index={number} size={number} />                      // expo-image, contentFit="contain", transparent bg
  <PhaseSlider value={number /*0..27*/} onChange={(i: number) => void} />
  <MoonPhaseModal visible={boolean} initialAngle={number | null} onSave={(angle: number) => void} onClose={() => void} />
  ```

- [ ] **Step 1: `MoonImage`.**
  - `expo-image` `Image` with `source={MOON_PHASE_IMAGES[index]}` and `style={{ width: size, height: size }}`.
  - Use `transition={150}` so changing phase cross-fades.
- [ ] **Step 2: `PhaseSlider`.**
  - Build it with `GestureDetector` and `Gesture.Pan()` raced with `Gesture.Tap()`, using reanimated shared values for the thumb x.
  - The track is full width. Tick marks at 0, 7, 14 and 21 show 🌑 🌓 🌕 🌗 under the track.
  - The thumb snaps to the nearest of 28 positions while dragging.
  - Each time the snapped index changes, call `runOnJS(onChange)(i)` and `runOnJS(selectionFeedback)()`.
  - On release, animate the thumb with `withSpring` to the snapped x.
  - Accessibility: `accessibilityRole="adjustable"`, with `accessibilityActions` increment and decrement ±1 that wrap 27↔0.
- [ ] **Step 3: `MoonPhaseModal`.**
  - Use the gluestack `Modal` pattern from `FlowerModal`, without `KeyboardAwareModal` because there's no text input.
  - Header: "Your favorite moon".
  - Body:
    - `MoonImage` at size 200.
    - `PHASE_EMOJIS + PHASE_LABELS` of `phaseName(indexToAngle(i))`.
    - "`Math.round(illuminationAtAngle * 100)`% lit".
    - The `PhaseSlider`.
  - Buttons Cancel and Save. Save calls `successFeedback()` then `onSave(indexToAngle(i))`.
  - The initial index is `angleToIndex(initialAngle ?? 180)`. Reset it whenever `visible` becomes true.
- [ ] **Step 4: Type-check.** tsc gives 0 errors.
- [ ] **Step 5: Commit:** `feat(moon): moon image, phase slider and favorite modal`.

### Task 5: Home moon card

**Files:**
- Create: `components/MoonCard/MoonCard.tsx`, `components/MoonCard/index.ts`
- Modify: `components/index.ts`
- Modify: `app/(tabs)/Home/index.tsx`: add the hooks, a `handleMoonPress` next to the other `router.push` handlers (~line 437), and the card after the Feeling `Box` (~line 651)

**Interfaces:**
- Consumes: `useMoonNow`, `useMoonFavorites` (Task 3); `MoonImage` (Task 4); `PHASE_LABELS`, `PHASE_EMOJIS`, `favoriteStatus`, `countdownText`, `nextPhaseTime`, `phaseName` (Task 2).
- Produces:
  ```ts
  <MoonCard moon={MoonInfo} now={Date} partnerName={string} hasPartner={boolean} partnerFavorite={number | null} onPress={() => void} />
  ```

- [ ] **Step 1: Build `MoonCard`.**
  - Use `PressableScale` + the theme card styling, matching `PressableCard`'s look and `PRESSABLE_CARD_HEIGHT`.
  - Left: `MoonImage` at size 100, the same as `PressableCard`'s `IMAGE_SIZE`.
  - Right column:
    - Bold `PHASE_LABELS[moon.name]`.
    - Secondary text "`{pct}`% lit · Full moon in `{n}` days", where `n` = days to `nextPhaseTime(180, now)`. During a full moon (`moon.name === 'full'`) it reads "Full moon tonight".
    - A pill (`theme.colors.primary` at low opacity) with `PHASE_EMOJIS[phaseName(partnerFavorite)]` + `countdownText(partnerName, …)`. Pass `null` when `partnerFavorite` is null. Hide the pill when `!hasPartner`.
  - Add an `accessibilityLabel` summarising the visible text.
- [ ] **Step 2: Wire Home.**
  - Call `useMoonNow()` and `useMoonFavorites({ roomId: user.roomId, userId: user.uid, partnerId })`.
  - `handleMoonPress` = `router.push('/(tabs)/Home/Moon')`.
  - Render `<MoonCard …/>` between the Feeling `Box` and `DailyQuestionCard`.
  - Add one more `<Skeleton height={PRESSABLE_CARD_HEIGHT} />` in the loading placeholder so the board doesn't jump.
- [ ] **Step 3: Type-check.** tsc gives 0 errors.
- [ ] **Step 4: Commit:** `feat(moon): compact moon card on Home`.

### Task 6: Moon screen

**Files:**
- Create: `app/(tabs)/Home/Moon.tsx`

**Interfaces:**
- Consumes: everything above; `upcomingLunarEvents`, `LunarEvent` (Task 2); `MoonPhaseModal` (Task 4); `useAppSelector` for `partnerName`/`partnerId`; `useAuth` for `user`; `useAppToast` for a save error.

- [ ] **Step 1: Header.** Use the same pattern as `DailyQuestion.tsx`: `ArrowLeft` back button + title "Moon". The screen body is a `ScrollView`.
- [ ] **Step 2: Tonight section.**
  - `MoonImage` at size 220, centered.
  - Phase label with its emoji.
  - "`{pct}`% lit · Day `{Math.floor(ageDays)}` of 29.5".
- [ ] **Step 3: Favorites section.**
  - Two rows:
    - "Your favorite": emoji + label, then from `favoriteStatus`: "Here tonight", "Tomorrow" or "In N days". Show "Not set" when null.
    - "`{partnerName}`'s favorite": uses `countdownText`. Omit this row when there's no partner.
  - A "Set my favorite" / "Change my favorite" button opens `MoonPhaseModal` with `initialAngle={myFavorite}`.
  - `onSave` → `saveFavorite`. On error, show `showToast({ status: 'error', … })`. Close on success.
- [ ] **Step 4: Upcoming section.**
  - `useMemo(() => upcomingLunarEvents(startOfToday), [dayKey])`, so it's computed once per day.
  - One row per event: emoji, title, then local date (`toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })`) with the relative "in N days".
  - Titles:
    - Full moon: "Full Moon", with suffix tags " · Supermoon" and/or " · Blue moon".
    - Eclipses: "Blood Moon 🔴 (total lunar eclipse)", "Partial lunar eclipse", "Penumbral lunar eclipse".
  - Total eclipses get an accent color.
- [ ] **Step 5: Type-check.** tsc gives 0 errors, and the Task 2 check passes.
- [ ] **Step 6: Commit:** `feat(moon): moon screen with favorites and upcoming lunar events`.

### Task 7: Device check

- [ ] **Step 1:** `npm run start` on the dev client. Check each of these:
  - **Home card**
    - The card shows tonight's photo with no pink edge in light and dark themes.
    - The phase name and % lit match a reference (e.g. timeanddate.com).
    - The card height matches the Flower and Feeling cards.
  - **Favorites and the pill**
    - With no favorite set by the partner, the pill reads "{p} hasn't picked a favorite moon yet".
    - Setting a favorite on phone A updates phone B's pill live.
    - The slider snaps across all 28 photos with a haptic tick each step. Dragging past either end doesn't jump, and Save persists.
    - Setting your own favorite to tonight's index shows "here tonight" on the partner's card.
  - **Moon screen**
    - The Moon screen lists about 12 full moons plus the next lunar eclipses (2027-02-20, 2027-07-18 and 2027-08-17, all penumbral, from Nov 2026).
  - **Refresh**
    - Backgrounding the app and returning refreshes the moon.
- [ ] **Step 2:** Run `npm run lint`. There are no new warnings in the touched files.
