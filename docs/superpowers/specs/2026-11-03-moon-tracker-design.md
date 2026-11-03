# Moon Tracker — Design

## Intent

A small, pretty, informative touch on the Home screen: tonight's moon, plus a playful
couple angle — each partner picks their favorite moon phase, and each sees a countdown
to the *other* person's favorite. Tapping the moon opens a screen with upcoming lunar
events (full moons, eclipses, blood moons, supermoons).

## Goals

- Home card showing tonight's real moon phase using photographic images.
- Each partner configures an exact favorite phase via a slider modal; it syncs to the partner.
- Home card shows a countdown to the partner's favorite phase.
- Moon detail screen listing upcoming lunar events.
- Fully offline: all astronomy computed on device, no API.

## Non-goals

- Moonrise/moonset times, eclipse visibility from the user's location (location features are
  intentionally disabled — see project memory; don't depend on location).
- Push notifications for moon events (possible later).
- Android home-screen widget (possible later).

## Anti-goals

- Images that jump around or change size between phases.
- A heavy card that dominates Home — it must be compact.

## Decided by the user

- **Layout: compact card** on Home, same height class as the Flower/Feeling cards. Small
  moon image on the left; phase name, % illuminated and "Full moon in N days" beside it;
  a pill underneath with the partner-favorite countdown.
- **Favorite phase picked with a slider in a modal**, configuring an exact phase (not just
  one of 8 named phases). The modal shows a big moon image that updates while dragging.
- **Images:** the user's 28-image set at `C:\Users\gabri\Downloads\phases\`
  (`james-greener-<index>-<n>.jpg`, index 0–27 = position in the lunar cycle; 0 = new,
  ~14 = full, 7 = first quarter lit on the right, 21 = last quarter lit on the left).
  Already centered and same-sized (714×714, disc ~360px centered) — no cropping-to-find
  needed. They have a flat pink background.
- Tapping the card opens the moon details screen with upcoming lunar events.

## How it works

### Astronomy

Use `astronomy-engine` (pure JS, MIT). Wrap it in `utils/moon.ts`:

- Current phase angle `MoonPhase(now)` (0–360°, 0 = new, 180 = full) and illuminated
  fraction `Illumination(Body.Moon, now).phase_fraction`.
- Image selection: image index `i` represents phase angle `i * 360/28`; show the image with
  the nearest angle (wrapping at 360).
- Phase name from angle (8 standard names: new, waxing crescent, first quarter, waxing
  gibbous, full, waning gibbous, last quarter, waning crescent).
- Next full moon: `SearchMoonPhase(180, now, 40)`.
- Countdown to a favorite: `SearchMoonPhase(favoriteAngle, now, 40)`.
- Lunar eclipses: `SearchLunarEclipse` / `NextLunarEclipse` → kind (penumbral / partial /
  total) and peak time. **Blood moon = total lunar eclipse.**
- Supermoon: a full moon whose Earth–Moon distance at that time is within ~90% of perigee
  range; compute with `GeoMoon`/distance at full moon and use the common definition
  (distance < 360,000 km). *Builder's call on exact threshold.*
- Blue moon: second full moon within the same calendar month (device local time).

### Favorite phase

- Stored as a phase angle in degrees (number) at
  `rooms/{roomId}/users/{uid}/favoriteMoonPhase`, alongside `selectedFlower`, following the
  `getFlower` / `updateFlower` pattern in `hooks/useFirebase.tsx`.
- Firebase rules are permissive for room user nodes (confirmed by the user), so no rules
  change is needed.
- Slider snaps to the 28 image positions (value = image index; stored as `index * 360/28`).
- "Is it here now": the favorite counts as *now* when the current phase is within ±half a
  day of the target (≈ ±6°). Pill text then reads "🌘 {partner}'s favorite is here tonight".
  Otherwise "🌘 {partner}'s favorite in N days" (round to whole days; "tomorrow" for 1).
- If the partner hasn't set a favorite, the pill invites the user to set theirs instead /
  shows nothing actionable for the partner. *Builder's call on exact copy.*
- Emoji per phase name (🌑🌒🌓🌔🌕🌖🌗🌘).

### Screens

- **Home card** (`components/MoonCard/`): compact, gradient card consistent with
  `FlowerPressable`/`FeelingPressable`. Inserted in Home after the Feeling card / before
  Daily Question (*my call*). Tap → `/(tabs)/Home/Moon`.
- **Moon screen** (`app/(tabs)/Home/Moon.tsx`): big moon image, phase name, % lit, age in
  days; "Your favorite" and "{partner}'s favorite" rows with countdowns and a "Set my
  favorite" button that opens the slider modal; then an "Upcoming" list for the next 12
  months: full moons (tagged Supermoon / Blue moon where applicable), lunar eclipses with
  kind, total ones labelled "Blood moon 🔴". Sorted by date, with date and relative time.
- **Favorite modal** (`components/MoonPhaseModal/`): large moon image, slider across 28
  positions, live phase name + % lit, Save/Cancel.
- **Slider is custom-built** on the already-installed `react-native-gesture-handler` +
  `react-native-reanimated` (with haptics on each snap via `utils/haptics.ts`). *My call:* no
  native slider package, because the app uses `runtimeVersion: fingerprint` and a new native
  dependency would block shipping this as an `eas update`. Everything in this feature must be
  pure JS (`astronomy-engine` is) so it can go out over the air.

### Assets

Preprocess the 28 JPGs once (script, `jimp-compact` is available in node_modules) into
`assets/moon/phase-00.webp` … `phase-27.webp` (or png if webp encoding isn't available):
crop to the disc's bounding square and make the pink background transparent (circular
mask), so the moon sits cleanly on dark or light cards. Downscale to ~400px. Require them
via a static map (`constants/moonPhases.ts`), like the flowers/feelings assets.

## Left to the builder

- Exact styling/colors within the existing theme tokens.
- Supermoon threshold details, copy wording, empty states.
- Whether to memoize/compute the 12-month event list once per day.
- Hemisphere: images are northern-hemisphere orientation. *My assumption:* the couple is in
  the northern hemisphere, so no flipping.
