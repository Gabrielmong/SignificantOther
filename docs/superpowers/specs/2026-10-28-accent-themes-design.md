# Accent Color Themes

## Goal

Let each person choose an accent palette ("theme") that replaces today's
purple/blue everywhere in the app: buttons, headers, gradients, tab bar,
chat, journal, map, and the Android home-screen widget. This works like
Slack's sidebar themes. The accent color changes, but the layout,
backgrounds, and light/dark mode stay as they are.

## Why

The app looks the same for every couple. Picking a color is a small,
personal touch that fits an app built around two people. Each partner
chooses their own color, which also gives "me vs. you" a more personal
meaning in shared views like chat.

## Decisions made during brainstorming

- **Accent only.** A theme changes accent colors only. Backgrounds,
  surfaces, text colors, and layout stay the same. Light/dark mode keeps
  working and is independent of the theme, so every theme has a light and
  a dark variant.
- **Per person.** Each partner picks their own theme on their own phone.
  It applies to everything on that phone, the widget included.
- **Your partner's color comes from your partner's theme.** Wherever the
  app distinguishes you from your partner (chat bubbles, journal entries,
  and so on), your side uses your theme's main color and their side uses
  *their* theme's main color. This means each person's choice has to sync
  through Firebase.
- **Same theme → different shades.** If both partners pick the same
  theme, the partner's side uses that theme's *alternate* shade so the two
  stay distinguishable.
- **Palettes.** Six themes, reviewed as mockups (values below).
- **Tab bar** stops using its fixed navy/cream colors. It follows
  light/dark surfaces, and the active tab uses the accent. This was shown
  in the mockup and accepted.

## Palettes

Each theme defines, per color mode, `main` → `main2` (the gradient pair
for headers, buttons, widget) and `alt` → `alt2` (the partner's shades
when both people share the theme).

| Theme | Mode | main | main2 | alt | alt2 |
|---|---|---|---|---|---|
| **Twilight** (current look, default) | light | `#8859ff` | `#5a1fff` | `#5d6ee8` | `#2a2f9e` |
| | dark | `#9d75ff` | `#6e34ff` | `#7179f6` | `#4a52d4` |
| **Rose** | light | `#e8457c` | `#be185d` | `#f0835a` | `#d4552c` |
| | dark | `#f472a0` | `#db2777` | `#f79b78` | `#e8673f` |
| **Ocean** | light | `#0e9fb4` | `#0b6f85` | `#3a72e0` | `#2448a8` |
| | dark | `#2cc3d6` | `#0e9fb4` | `#6b97f2` | `#3a72e0` |
| **Forest** | light | `#2f9e6a` | `#1d6f49` | `#8a9a2a` | `#5f6c14` |
| | dark | `#4cc48b` | `#2f9e6a` | `#b0c24a` | `#8a9a2a` |
| **Sunset** | light | `#ef7a2c` | `#c2510f` | `#de4561` | `#a8233e` |
| | dark | `#ff9a52` | `#ef7a2c` | `#f06b83` | `#de4561` |
| **Graphite** | light | `#475569` | `#1e293b` | `#7c8aa0` | `#55627a` |
| | dark | `#a8b4c6` | `#64748b` | `#d0d7e2` | `#94a3b8` |

Twilight is based on today's purple (self) and indigo-blue (partner)
from `config/theme/colors.ts`. It does **not** need to match today
pixel for pixel. Today's colors are inconsistent: the theme file, the
hardcoded Tailwind violet `#8B5CF6`/`#7C3AED`, and the journal's
`#3B82F6`/`#2563EB` all disagree. Everything moves onto Twilight, and
small visible shifts for existing users are expected and wanted
(decided by the user: "past is wrong, we want right moving forward").
No legacy color table.

The builder may tune individual hex values for contrast (see
"Readability" below) as long as each theme keeps its character.

## Current state (what the builder is starting from)

- `config/theme/colors.ts` defines `purple`/`blue` scales and
  `lightColors`/`darkColors` semantic maps (`primary`, `primary50..900`,
  `secondary…`, `messageSelf`, `messagePartner`, `journalSelf`,
  `journalPartner`, `buttonPrimary`, `borderFocus`, …). Dark mode uses its
  own hardcoded accent shades.
- `config/theme/gradients.ts` holds hardcoded hex gradients (`primary`,
  `primaryBold`, `primarySubtle`, `primaryVertical`, `ocean`,
  `secondaryBold`, `secondarySubtle`, `sunset`, `aurora`, plus glass and
  overlay rgba values).
- `config/theme/index.ts` `createTheme(colorMode)` assembles the theme.
  `contexts/ThemeContext.tsx` holds `colorMode` (AsyncStorage key
  `@SignificantOther:theme`). `hooks/useAppTheme.tsx` exposes it.
- **About 280 hardcoded colors** live outside `config/theme`. Most of the
  accent ones are Tailwind violet `#8B5CF6` and pink `#EC4899`, used as
  `theme?.gradients?.primary?.colors?.[0] || '#8B5CF6'` fallbacks. The
  biggest offenders are `app/(tabs)/Home/Map.tsx`, `AddZoneModal`,
  `AddCountdownModal`, `Wishlist`, `FavoriteThings`, `Journal/index.tsx`,
  `Journal/[id].tsx`, `ZoneCard`, `LocationAndZonesSection`,
  `CountdownsSection`, `CountdownCard`, `WhiteBoard`, and
  `Home/index.tsx`.
- The self/partner journal gradients are hardcoded
  (`app/(tabs)/Home/Journal/index.tsx:163-164`,
  `app/(tabs)/Home/Journal/[id].tsx:83`).
- Existing bug: `Map.tsx:444` reads `theme.gradients.secondary`, which
  does not exist, so the partner color is always the pink fallback.
- The tab bar (`app/(tabs)/_layout.tsx:27-42`) is fully hardcoded
  (`#2D3250` / `#F5E8C7` / `#7077A1`).
- The widget (`widgets/PartnerStatusWidget.tsx`) uses a hardcoded
  `CARD_GRADIENT` (`#9d75ff` → `#5a1fff`) and tinted text (`#f3edff`,
  `#f0eaff`). It renders in a headless JS task
  (`widgets/widgetTaskHandler.tsx`) that reads from AsyncStorage
  (`services/widgetTask.ts`). `renderAllWidgets` in
  `widgets/renderWidgets.tsx` forces a repaint.
- User profiles live at `users/{uid}` in Firebase Realtime DB. Partner
  profiles are read with `getUserProfile(uid)` (`hooks/useFirebase.tsx`).
  `room.partnerId` is in Redux (`state/slices/roomSlice.ts`).
- There is no test runner in the project.

## Components

### 1. Theme definitions (`config/theme/`)

- Add an accent-theme registry, for example
  `config/theme/accentThemes.ts`: an id (`twilight | rose | ocean |
  forest | sunset | graphite`), a display name, and the light/dark
  `main/main2/alt/alt2` values above.
- `createTheme(colorMode, accentId, partnerAccentId?)` derives
  everything accent-dependent from the registry instead of from
  hardcoded hex:
  - `primary`, `primary50..900`, `borderFocus`, `buttonPrimary`,
    `messageSelf`, `journalSelf` come from the user's theme.
  - `secondary…`, `messagePartner`, `journalPartner` come from the
    partner's resolved color (section 3).
  - Accent gradients (`primary`, `primaryBold`, `primarySubtle`,
    `primaryVertical`, `secondary*`, `ocean`, `sunset`, `aurora`) are
    built from main/main2/alt/alt2. Glass and overlay gradients stay
    neutral.
  - The builder chooses how to fill the 50..900 scales: hand-written per
    theme, or generated from `main` by lightening and darkening. The
    scales must look right in both modes.
  - Add a `partner` gradient (and a `self` alias if useful) so screens
    stop reaching for `secondary`/`ocean` by name.
- **Slot → token mapping** *(builder-check follow-up; Claude's call)*:
  - Solid accents (`primary`, `primary500`, `buttonPrimary`,
    `borderFocus`, `messageSelf`, tab active tint) → `main`.
  - Deeper accents (`primary600..700`, `journalSelf`) → `main2`.
  - Self gradients (`primary`, `primaryBold`, header/button/widget
    gradients) → `main → main2`. Subtle/vertical variants are derived
    from the scale around `main`.
  - Partner side mirrors this: `messagePartner` and `secondary` take the
    resolved partner solid color, `journalPartner` takes the resolved
    partner deep color, and `gradients.partner` takes the resolved
    partner pair. The partner pair is `alt → alt2` on the same theme, or
    the partner theme's `main → main2` otherwise.
- **Gluestack defaults** *(builder-check follow-up; Claude's call, since
  the request was "the whole app")*: the app uses the stock
  `@gluestack-ui/config`, so un-styled Gluestack `Button`, `Switch`,
  `Spinner`, focus rings, and similar controls render Gluestack's
  default blue. Build the Gluestack config per accent and mode by
  overriding its `primary` color tokens from the active theme, and pass
  it to both `GluestackUIProvider`s (`app/_layout.tsx`,
  `app/(tabs)/_layout.tsx`). Restyling each instance is not the plan.
  Check these controls by eye during verification, because the hex grep
  won't catch them.
- Add an **on-accent text color** per theme and mode (white on most
  themes; dark text where white fails contrast, e.g. Graphite dark
  `#a8b4c6`). Every place that puts text on an accent uses it.

### 2. Theme state and persistence (`contexts/ThemeContext.tsx`)

- Add `accentId` and `setAccentId` next to `colorMode`, and expose both
  through `useAppTheme`.
- Save locally under a new AsyncStorage key so the theme applies on
  first paint with no flash of purple. Also write it to Firebase at
  `users/{uid}/accentTheme` so the partner's phone can see it.
- Unknown or missing values fall back to `twilight`.
- **Source of truth** *(builder-check follow-up; Claude's call)*:
  Firebase `users/{uid}/accentTheme` is the source of truth, and the
  local key is only a cache for first paint.
  - On login or app start with a known uid, read the user's own node.
    If it has a value, it wins over the cache.
  - Never write the `twilight` fallback to Firebase. Write only when the
    user picks a theme, so a reinstall can't overwrite a real choice.
  - On logout, clear the accent cache, the partner-accent cache, and the
    widget's accent copy, the same way `services/widgetTask.ts` already
    clears its `@widget_task_*` keys. The next account won't inherit
    them.
  - `ThemeProvider` sits above auth in `app/_layout.tsx`. It can get
    uid/partnerId by reading Redux (the store provider is above it, or
    can be moved there), or a small component inside the auth tree can
    push them into the context. The builder picks.
- Add `partnerAccentId` to the context. Load it from
  `users/{partnerId}/accentTheme`, listening live so a partner's change
  shows up without restarting the app. Cache it locally so first paint
  is correct offline.

### 3. Partner color resolution

```
partnerColors = partnerAccentId === accentId
  ? myTheme.alt / alt2                  // same theme → alternate shades
  : partnerTheme.main / main2           // different theme → their colors
```

- If the partner hasn't chosen a theme (or there is no partner yet), use
  the default `twilight`. That applies the same rule, so a Twilight user
  with a no-choice partner sees today's purple/blue.
- This resolution happens once inside `createTheme`. Screens only read
  `messagePartner`, `journalPartner`, and `gradients.partner`.

### 4. Remove hardcoded accents (the bulk of the work)

- Every accent-like hardcoded color outside `config/theme` goes through
  the theme: `#8B5CF6`, `#7C3AED`, `#EC4899` (when used as an accent),
  `#3B82F6`/`#2563EB` (when used for the partner), and the
  `|| '#8B5CF6'` fallbacks. The fallbacks go away entirely, since the
  theme is always present.
- **Self vs. partner usages** move to the self/partner tokens: journal
  gradients, chat, map partner markers/zones (this also fixes the
  `Map.tsx:444` bug), and any partner-vs-me coloring in daily
  questions, mood calendar, and countdowns.
- **Not touched:** content/category color maps that identify *what*
  something is rather than whose it is (Wishlist and FavoriteThings
  category gradients such as music pink and movies blue), semantic
  colors (success/error/warning/info), neutrals and whites/blacks, and
  the drawing colors offered on the whiteboard. One exception: the
  Wishlist/FavoriteThings "all" category gradient
  (`['#8B5CF6','#EC4899']`) is an accent stand-in and becomes the user's
  primary gradient.
- **Tab bar** (`app/(tabs)/_layout.tsx`): the background uses
  `theme.colors.surface` (or `surfaceElevated`), the active tint uses
  `theme.colors.primary`, and the inactive tint uses a neutral
  `textTertiary`. Keep the existing floating shape and shadow.

### 5. Widget (`widgets/`)

- The widget uses **the phone owner's** theme in the current color
  mode: `CARD_GRADIENT` comes from `main → main2`, and the tinted text
  (`#f3edff`, `#f0eaff`) becomes on-accent text at reduced opacity.
- The headless task can't read React context. Save what it needs (the
  accent id, or the resolved gradient and text colors) to AsyncStorage
  next to the existing `@widget_task_*` keys, and read it in
  `widgetTaskHandler.tsx` before rendering.
- When the user changes theme or color mode, call `renderAllWidgets` so
  the widget repaints right away instead of waiting for the 30-minute
  refresh.

### 6. Picker UI (Profile tab)

- Add a "Theme" row on `app/(tabs)/Profile/index.tsx` next to the Dark
  Mode switch, showing the current theme's swatch.
- It opens a picker (modal or bottom sheet, following existing modals
  like `NotificationsModal`) with the six themes as swatch cards. Each
  card shows the name, the main/alt colors, and a small preview of a
  "me" bubble next to a "partner" bubble.
- Selecting a theme applies it immediately (live preview), saves it,
  and syncs it. No separate save button.

## Non-goals

- Full UI themes (backgrounds, surfaces, fonts, layouts).
- A free-form custom color picker.
- Alternate app icons, splash screen, notification icon color.
- An iOS widget (none exists).
- Letting a user override how their partner's color appears.
- Theming category/content colors.

## Anti-goals (failure even if it "works")

- **A half-themed app.** If a user picks Forest and still sees violet or
  pink accents anywhere, the feature has failed. Grep for leftover
  accent hexes as part of finishing.
- **Indistinguishable sides.** In any shared view, "me" and "partner"
  must never end up the same color.
- **Unreadable text.** Text on accent backgrounds must stay legible in
  every theme × mode combination (aim for WCAG AA, 4.5:1 for body text).
- **A flash of the wrong theme** on app start or after login.
- **A jarring change for existing users** before they choose anything.
  Twilight should still read as "the same purple app", even though
  inconsistent spots get unified.

## Verification

There is no test runner. Verify manually on an Android device or
emulator:

1. Fresh install and existing user: the app reads as today's purple app
   (Twilight) in both modes, now with consistent accents across screens.
2. Switch through all six themes in light and dark mode. Check Home,
   Chat, Journal (list and entry), Map, Wishlist, Favorite Things,
   Countdowns, Calendar, Daily Question, Profile, the tab bar, and both
   widget sizes.
3. Two accounts in one room: A picks Rose and B picks Ocean. A sees
   their own bubbles in Rose and B's in Ocean, and vice versa. Then
   both pick Rose, and each sees the partner in Rose's alternate
   (peach).
4. Change the theme on B's phone. A's chat updates without a restart.
5. Kill and relaunch the app. There's no flash of purple when a
   non-default theme is set.
6. Grep `app/`, `components/`, and `widgets/` for `#8B5CF6`,
   `#7C3AED`, `#EC4899`, `#3B82F6`, `#2563EB`, `#9d75ff`, `#5a1fff`,
   `#2D3250`, `#F5E8C7`, and `#7077A1`. Any remaining hit must be a
   documented content/category color.

## Left to the builder

- How to generate the 50..900 scales and the exact contrast tweaks.
- The exact registry and file layout, and whether partner resolution
  lives in `createTheme` or in a small helper it calls.
- The picker's exact visual design, within the existing modal style.
- Whether the widget caches the accent id or resolved colors.
- How to split the hardcoded-color cleanup into commits (by screen is
  fine).
