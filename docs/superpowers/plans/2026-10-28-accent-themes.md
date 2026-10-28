# Accent Themes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let each partner pick one of six accent palettes. The pick recolors the whole app and the Android widget, and each phone shows the partner's side in the partner's own palette.

**Architecture:** A registry in `config/theme/accentThemes.ts` defines the six palettes. `createTheme(colorMode, accentId, partnerAccentId)` turns the registry into every accent token and gradient, so screens only read tokens. `ThemeContext` stores the user's own accent and the partner's accent. It caches both in AsyncStorage for first paint, syncs them through `users/{uid}/accentTheme` in Firebase RTDB, builds a Gluestack config from the theme, and pushes resolved colors into the widget cache. The remaining tasks replace hardcoded accent hex values in screens with tokens.

**Tech Stack:** Expo SDK 54, React Native 0.81, `@gluestack-ui/themed` v1 with `@gluestack-ui/config`, `expo-linear-gradient`, Firebase Realtime Database (web SDK), AsyncStorage, `react-native-android-widget` 0.22. There are no automated tests; this repo has no test runner, and earlier plans dropped tests at the user's request. Checks are type-checking plus the device checklist in Task 9.

**Spec:** `docs/superpowers/specs/2026-10-28-accent-themes-design.md`

## Global Constraints

- Theme ids are exactly `twilight | rose | ocean | forest | sunset | graphite`. Display names are `Twilight`, `Rose`, `Ocean`, `Forest`, `Sunset`, `Graphite`. The default is `twilight`.
- Palette hex values are copied verbatim from the spec's Palettes table (repeated in Task 1).
- Firebase path: `users/{uid}/accentTheme`, a string id. Never write the `twilight` fallback there. Write only when the user picks a theme.
- AsyncStorage keys: `@SignificantOther:accent` and `@SignificantOther:partnerAccent`. The existing `@SignificantOther:theme` key (color mode) is unchanged.
- Partner rule: same id as mine → my theme's `alt/alt2`. Different id → the partner theme's `main/main2`. Missing or unknown partner id → `twilight`.
- Text on an accent color uses `readableTextOn(hex)`: white `#ffffff` if its contrast with the color is ≥ 3:1, otherwise `#111827`. (The spec says "aim for AA 4.5". Today's own purple `#8859ff` is only 4.27:1 with white, so 4.5 would put dark text on the default theme's buttons. 3:1 is AA for bold/large text and UI components, and it still flips the light dark-mode accents, e.g. Ocean dark `#2cc3d6`, to dark text.)
- Not touched: category/content color maps (Wishlist and FavoriteThings `categoryGradients`, except the "all" chip), semantic colors, neutrals, whiteboard drawing colors, `hooks/useLocation.tsx` `notificationColor`, `app.config.ts`, and the app icon/splash.
- `npx tsc --noEmit` reports **45 errors on `main`**. Do not add new ones. Files this plan touches that already have errors: `app/(tabs)/Chat/index.tsx`, `Home/FavoriteThings.tsx`, `Home/index.tsx`, `Home/Journal/[id].tsx`, `Home/Journal/editor.tsx`, `Home/Journal/index.tsx`, `Home/Map.tsx`, `Home/Wishlist.tsx`, `components/AddZoneModal/AddZoneModal.tsx`, `components/CountdownsSection/CountdownsSection.tsx`, `components/GradientButton/GradientButton.tsx`. Fewer errors is fine; more is not.
- Commit messages end with a blank line, then `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Cold start for a logged-in user with a non-default theme.** Auth resolves after the first render, so `uid` is empty at first. Expected: the cached accent paints first with no purple flash, and the empty `uid` at startup does **not** count as a logout and wipe the cache. Handled in Task 3: reset only on a non-empty → empty `uid` transition.
2. **Reinstall or a new phone.** The local cache is empty, so the app shows Twilight until the Firebase read returns. Expected: it then switches to the saved theme, and nothing writes `twilight` back to Firebase. Handled in Task 3, checked in Task 9.
3. **The partner has never picked a theme, or no partner has joined yet.** `room.partnerId` is `''` or `users/{partnerId}/accentTheme` is null. Expected: the partner is treated as `twilight`. A Twilight user then sees partner = Twilight alt (indigo), and no listener is attached to `users/`. Handled in Tasks 1 and 3.
4. **Garbage in Firebase.** An unknown string, such as a theme removed in a later version, or a non-string value. Expected: `toAccentId` falls back to `twilight` instead of crashing `createTheme`. Handled in Task 1.
5. **Widget rendered before the app ever synced an accent.** The cache has no `accent` field (an existing install), or the cache is null. Expected: the widget draws Twilight light, as it looks today. Handled in Task 5.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `config/theme/colorMath.ts` | Create | `mixHex`, `contrastRatio`, `readableTextOn`, `buildScale` |
| `config/theme/accentThemes.ts` | Create | Palette registry, id helpers, partner resolution |
| `config/theme/colors.ts` | Modify | `getColors(mode, self, partner)` builds accent tokens; delete `purple`/`blue` |
| `config/theme/gradients.ts` | Modify | `buildGradients(…)` replaces the static accent gradients |
| `config/theme/gluestack.ts` | Create | `createGluestackConfig(theme)` |
| `config/theme/index.ts` | Modify | `createTheme(colorMode, accentId, partnerAccentId)`; re-exports |
| `services/accentStorage.ts` | Create | AsyncStorage get/set/clear for both accent keys |
| `contexts/ThemeContext.tsx` | Modify | Accent state, Firebase listeners, logout reset, gluestack config, widget sync |
| `hooks/useAuth.tsx` | Modify | `logout` clears accent storage |
| `app/_layout.tsx`, `app/(tabs)/_layout.tsx` | Modify | Themed Gluestack config; themed tab bar |
| `services/widgetTask.ts`, `widgets/renderWidgets.tsx`, `widgets/PartnerStatusWidget.tsx` | Modify | `accent` in widget cache; widget colors from it |
| `components/ThemePickerModal/ThemePickerModal.tsx` | Create | Swatch picker |
| `app/(tabs)/Profile/index.tsx` | Modify | "Theme" row |
| Screens and components with hardcoded accents | Modify | Tasks 6–8 |

---

### Task 1: Palette registry and color math

**Files:**
- Create: `config/theme/colorMath.ts`
- Create: `config/theme/accentThemes.ts`

**Interfaces:**
- Produces (`colorMath.ts`):
  - `mixHex(a: string, b: string, weight: number): string` returns `#rrggbb`. `weight` is the share of `b`, from 0 to 1.
  - `contrastRatio(a: string, b: string): number` uses the WCAG 2 relative-luminance formula.
  - `readableTextOn(bg: string): '#ffffff' | '#111827'` follows the Global Constraints rule.
  - `type Scale = Record<50|100|200|300|400|500|600|700|800|900, string>`
  - `buildScale(main: string): Scale` runs light to dark. `500 = main`. `50/100/200/300/400` mix `main` toward `#ffffff` with weights `0.92/0.84/0.68/0.48/0.24`. `600/700/800/900` mix toward `#000000` with weights `0.14/0.28/0.42/0.56`.
- Produces (`accentThemes.ts`):
  - `type AccentId = 'twilight' | 'rose' | 'ocean' | 'forest' | 'sunset' | 'graphite'`
  - `type AccentShades = { main: string; main2: string; alt: string; alt2: string }`
  - `type AccentTheme = { id: AccentId; name: string; light: AccentShades; dark: AccentShades }`
  - `ACCENT_IDS: readonly AccentId[]` (in the table order below), `DEFAULT_ACCENT: AccentId = 'twilight'`, `accentThemes: Record<AccentId, AccentTheme>`
  - `isAccentId(v: unknown): v is AccentId`, `toAccentId(v: unknown): AccentId` (falls back to `DEFAULT_ACCENT`)
  - `type ColorPair = { solid: string; deep: string }`
  - `selfPair(mode: ColorMode, mine: AccentId): ColorPair` returns `{solid: main, deep: main2}`
  - `partnerPair(mode: ColorMode, mine: AccentId, partner: AccentId): ColorPair` follows the partner rule in Global Constraints
  - `altPair(mode: ColorMode, mine: AccentId): ColorPair` returns `{solid: alt, deep: alt2}` of my own theme (for "work" zones)

Palette values (spec, verbatim):

| id | mode | main | main2 | alt | alt2 |
|---|---|---|---|---|---|
| twilight | light | `#8859ff` | `#5a1fff` | `#5d6ee8` | `#2a2f9e` |
| twilight | dark | `#9d75ff` | `#6e34ff` | `#7179f6` | `#4a52d4` |
| rose | light | `#e8457c` | `#be185d` | `#f0835a` | `#d4552c` |
| rose | dark | `#f472a0` | `#db2777` | `#f79b78` | `#e8673f` |
| ocean | light | `#0e9fb4` | `#0b6f85` | `#3a72e0` | `#2448a8` |
| ocean | dark | `#2cc3d6` | `#0e9fb4` | `#6b97f2` | `#3a72e0` |
| forest | light | `#2f9e6a` | `#1d6f49` | `#8a9a2a` | `#5f6c14` |
| forest | dark | `#4cc48b` | `#2f9e6a` | `#b0c24a` | `#8a9a2a` |
| sunset | light | `#ef7a2c` | `#c2510f` | `#de4561` | `#a8233e` |
| sunset | dark | `#ff9a52` | `#ef7a2c` | `#f06b83` | `#de4561` |
| graphite | light | `#475569` | `#1e293b` | `#7c8aa0` | `#55627a` |
| graphite | dark | `#a8b4c6` | `#64748b` | `#d0d7e2` | `#94a3b8` |

- [ ] **Step 1: Write `colorMath.ts` and `accentThemes.ts`** with the interfaces above. `ColorMode` is imported from `./colors`.
- [ ] **Step 2: Sanity-check the math.** Run `npx tsx -e "import {contrastRatio,readableTextOn,buildScale} from './config/theme/colorMath'; console.log(contrastRatio('#8859ff','#ffffff').toFixed(2), readableTextOn('#8859ff'), readableTextOn('#2cc3d6'), buildScale('#8859ff')[500])"`
  Expected: `4.27 #ffffff #111827 #8859ff`. If `tsx` is unavailable, `npx --yes tsx …` fetches it; do not add it to `package.json`.
- [ ] **Step 3: Type-check.** Run `npx tsc --noEmit 2>&1 | grep -E "^config/theme"`. Expected: no output.
- [ ] **Step 4: Commit.** `git add config/theme/colorMath.ts config/theme/accentThemes.ts` and commit `feat(theme): add accent palette registry`.

---

### Task 2: Theme builder uses the registry

**Files:**
- Modify: `config/theme/colors.ts` (delete the `purple`/`blue` scales; replace `lightColors`/`darkColors`/`getColors`)
- Modify: `config/theme/gradients.ts`
- Create: `config/theme/gluestack.ts`
- Modify: `config/theme/index.ts:6-20, 58-63, 65-120, 130-165`

**Interfaces:**
- Consumes: everything from Task 1.
- Produces:
  - `getColors(mode: ColorMode, self: ColorPair, partner: ColorPair, alt: ColorPair): ThemeColors`. It keeps every existing key with the same name and adds `onPrimary`, `onPartner`, `accentAlt`. `ThemeColors` becomes an explicit `interface` (or `ReturnType<typeof getColors>`); `LightColors`/`DarkColors` go away. `ColorKey = keyof ThemeColors`.
  - `buildGradients(mode: ColorMode, self: ColorPair, partner: ColorPair): Record<GradientKey, GradientConfig>`. The keys are the existing ones plus `partner`: `primary, primarySubtle, primaryBold, primaryVertical, partner, ocean, secondarySubtle, secondaryBold, sunset, aurora, glassDark, glassLight, overlayDark, overlayLight`. The static `gradients` export and `getGradient` are removed; nothing outside `config/theme` imports them.
  - `createTheme(colorMode: ColorMode = 'dark', accentId: AccentId = DEFAULT_ACCENT, partnerAccentId: AccentId = DEFAULT_ACCENT): Theme`. `Theme` gains `accentId: AccentId` and `partnerAccentId: AccentId`, and `Theme.gradients` is typed from `buildGradients`.
  - `createGluestackConfig(theme: Theme): typeof config` from `@gluestack-ui/config`.
  - `index.ts` re-exports `accentThemes`, `ACCENT_IDS`, `DEFAULT_ACCENT`, `toAccentId`, `isAccentId`, `type AccentId`, `readableTextOn`, `createGluestackConfig`.

Token mapping (spec, "Slot → token mapping"). `S = buildScale(self.solid)` and `P = buildScale(partner.solid)`. Dark mode reverses the 50–400 / 800–900 steps, as it does today.

| Token | Light | Dark |
|---|---|---|
| `primary`, `primary500`, `buttonPrimary`, `borderFocus`, `messageSelf` | `self.solid` | `self.solid` |
| `primary600`, `primary700`, `journalSelf` | `self.deep` (both) | `self.deep` (both) |
| `primary50..400` | `S[50..400]` | `S[900], S[800], S[700], S[600], S[400]` |
| `primary800`, `primary900` | `S[800]`, `S[900]` | `S[200]`, `S[100]` |
| `secondary`, `secondary500`, `buttonSecondary`, `messagePartner` | `partner.solid` | `partner.solid` |
| `secondary600`, `secondary700`, `journalPartner` | `partner.deep` | `partner.deep` |
| `secondary50..400`, `800`, `900` | from `P`, same pattern as primary | same |
| `onPrimary` | `readableTextOn(self.solid)` | same |
| `onPartner` | `readableTextOn(partner.solid)` | same |
| `accentAlt` | `alt.solid` | `alt.solid` |

All non-accent tokens (backgrounds, text, borders, semantic, `cardBackground`, `inputBackground`, `white/black/transparent`) keep their current values for each mode.

Gradients (`start`/`end`/`locations` unchanged from today's file). `S400` means `buildScale(self.solid)[400]`, and likewise for the others.
- `primary`, `primaryBold`: `[self.solid, self.deep]`. `primarySubtle`: `[S400, self.solid]`. `primaryVertical`: `[S300, self.solid, self.deep]`.
- `partner`, `ocean`, `secondaryBold`: `[partner.solid, partner.deep]`. `secondarySubtle`: `[P400, partner.solid]`.
- `sunset`: `[S400, self.solid, partner.solid]`. `aurora`: `[S300, S400, P400, partner.solid]`.
- `glass*` and `overlay*` stay exactly as they are.

Gluestack: return `{ ...config, tokens: { ...config.tokens, colors: { ...config.tokens.colors, primary0..primary950 } } }`. The values come from the **light-ordered** `buildScale(self.solid)`: `primary0 = mixHex(S50,'#ffffff',0.5)`, `primary50..900 = S[50..900]`, and `primary950 = mixHex(S900,'#000000',0.5)`. Gluestack handles dark mode by picking different steps itself.

- [ ] **Step 1: Rewrite `colors.ts`, `gradients.ts`, `index.ts`; create `gluestack.ts`.** `createTheme` resolves `selfPair`/`partnerPair`/`altPair` and passes them to `getColors` and `buildGradients`. Keep `applyOpacity` and the other non-color exports as they are. Remove `lightTheme`/`darkTheme` if nothing imports them (grep first), otherwise keep them as `createTheme('light')`/`createTheme('dark')`.
- [ ] **Step 2: Check Twilight still matches the intent.** Run `npx tsx -e "import {createTheme} from './config/theme'; const t=createTheme('light','twilight','twilight'); console.log(t.colors.primary, t.colors.messagePartner, t.colors.onPrimary, createTheme('dark','rose','ocean').colors.messagePartner)"`
  Expected: `#8859ff #5d6ee8 #ffffff #2cc3d6`.
- [ ] **Step 3: Type-check.** Run `npx tsc --noEmit 2>&1 | grep -c "error TS"`. Expected: ≤ 45. Also run `npx tsc --noEmit 2>&1 | grep -E "^(config/theme|contexts/)"` and expect no output.
- [ ] **Step 4: Commit** `feat(theme): build accent tokens and gradients from palettes`.

---

### Task 3: Accent state, persistence and sync

**Files:**
- Create: `services/accentStorage.ts`
- Modify: `contexts/ThemeContext.tsx`
- Modify: `hooks/useAppTheme.tsx` (if it re-declares the context type)
- Modify: `hooks/useAuth.tsx:141-155`
- Modify: `app/_layout.tsx:3, 20-24`
- Modify: `app/(tabs)/_layout.tsx:2-3, 23-48`

**Interfaces:**
- Consumes: `createTheme`, `createGluestackConfig`, `toAccentId`, `isAccentId`, `AccentId`, `DEFAULT_ACCENT` (Task 2).
- Produces:
  - `services/accentStorage.ts`: `loadCachedAccents(): Promise<{ accentId: AccentId; partnerAccentId: AccentId }>`, `cacheAccent(id: AccentId): Promise<void>`, `cachePartnerAccent(id: AccentId): Promise<void>`, `clearAccentStorage(): Promise<void>`. The keys are listed in Global Constraints, and every function catches and logs errors the same way `services/widgetTask.ts` does.
  - The context value adds `accentId: AccentId`, `partnerAccentId: AccentId`, `setAccentId(id: AccentId): void`, and `gluestackConfig: ReturnType<typeof createGluestackConfig>`. `useAppTheme()` returns them.

Behavior of `ThemeProvider`:
- Read `uid` from `useAppSelector((s) => s.user.uid)` and `partnerId` from `useAppSelector((s) => s.room.partnerId)`. The provider is already inside the Redux `Provider` in `app/_layout.tsx`.
- **Mount:** load the color mode as today, plus `loadCachedAccents()`. `isLoading` stays true until both are loaded.
- **`uid` non-empty:** subscribe with `onValue(ref(getDatabase(), \`users/${uid}/accentTheme\`))`. When the value `isAccentId`, set the state and `cacheAccent`. When it is null, do nothing (keep the cache). Unsubscribe when `uid` changes or on unmount.
- **`partnerId` non-empty:** subscribe to `users/${partnerId}/accentTheme`. Set the state with `toAccentId(value)` (null → `twilight`) and `cachePartnerAccent`.
- **`uid` goes from non-empty to empty** (track the previous value in a ref): reset both ids to `DEFAULT_ACCENT`. An empty `uid` on first render is not a logout.
- **`setAccentId(id)`:** set the state, `cacheAccent(id)`, and if `uid` is set, `set(ref(db, \`users/${uid}/accentTheme\`), id)`. Log errors without throwing.
- `theme = useMemo(() => createTheme(colorMode, accentId, partnerAccentId))` and `gluestackConfig = useMemo(() => createGluestackConfig(theme))`.

`useAuth.logout`: call `await clearAccentStorage()` next to `clearWidgetTaskUserInfo()`.

Layouts: both `GluestackUIProvider`s use `gluestackConfig` from `useAppTheme()` instead of the imported `config`. The tab bar in `app/(tabs)/_layout.tsx` uses `theme.colors.surface` for `tabBarActiveBackgroundColor`, `tabBarInactiveBackgroundColor` and `tabBarStyle.backgroundColor`; `theme.colors.primary` for `tabBarActiveTintColor`; and `theme.colors.textTertiary` for `tabBarInactiveTintColor`. Keep the shape, height, margins, elevation and shadow.

- [ ] **Step 1: Create `services/accentStorage.ts`.**
- [ ] **Step 2: Update `ThemeContext.tsx` and `useAppTheme.tsx`** as described.
- [ ] **Step 3: Update `useAuth.logout`, `app/_layout.tsx` and `app/(tabs)/_layout.tsx`.**
- [ ] **Step 4: Type-check.** Run `npx tsc --noEmit 2>&1 | grep -c "error TS"`. Expected: ≤ 45.
- [ ] **Step 5: Smoke test.** Run `npx expo run:android` (or the existing dev client). The app opens in Twilight, and the tab bar follows light/dark mode with a purple active icon. Toggling dark mode still works.
- [ ] **Step 6: Commit** `feat(theme): persist and sync accent choice, theme gluestack and tab bar`.

---

### Task 4: Theme picker on Profile

**Files:**
- Create: `components/ThemePickerModal/ThemePickerModal.tsx`
- Modify: `components/index.ts` (export it, following the existing pattern)
- Modify: `app/(tabs)/Profile/index.tsx:8, 15, 145-182`

**Interfaces:**
- Consumes: `useAppTheme()` → `accentId`, `partnerAccentId`, `setAccentId`, `theme`, `colorMode` (Task 3); `accentThemes`, `ACCENT_IDS`, `readableTextOn` (Task 2); `partnerPair`/`selfPair` (Task 1).
- Produces: `ThemePickerModal({ visible, onClose }: { visible: boolean; onClose: () => void })`.

The modal follows `components/NotificationsModal/NotificationsModal.tsx` (structure, surface colors, close behavior). It shows one card per id in `ACCENT_IDS` order. Each card has:
- the theme name;
- two dots: `main` and `alt` for the current color mode;
- a small preview: a "me" bubble in `main`, and a "partner" bubble in `partnerPair(colorMode, id, partnerAccentId).solid`, each with `readableTextOn` text.

The selected card has a `theme.colors.primary` border. Tapping a card calls `setAccentId(id)` immediately, so the whole app re-themes behind the modal. There is no save button.

On Profile, add a row directly below the Dark Mode row, styled like it (surface background, `radii.md`, `shadows.sm`). It has a `Palette` icon from `lucide-react-native`, the label `Theme`, the current theme name, and a 20px swatch circle in `theme.colors.primary`. Tapping it opens the modal.

- [ ] **Step 1: Build `ThemePickerModal` and export it.**
- [ ] **Step 2: Add the Profile row.**
- [ ] **Step 3: Type-check.** Run `npx tsc --noEmit 2>&1 | grep -E "^(components/ThemePickerModal|app/\(tabs\)/Profile)"`. Expected: no output.
- [ ] **Step 4: On device**, pick Ocean. Profile, the tab bar and the dark-mode switch track turn teal right away. Kill and relaunch: the app is still Ocean, with no purple flash. Pick Twilight again.
- [ ] **Step 5: Commit** `feat(theme): add theme picker to profile`.

---

### Task 5: Widget follows the accent

**Files:**
- Modify: `services/widgetTask.ts:10-17`
- Modify: `widgets/renderWidgets.tsx`
- Modify: `widgets/PartnerStatusWidget.tsx:10-14, 48-218`
- Modify: `contexts/ThemeContext.tsx` (one effect)

**Interfaces:**
- Consumes: `theme.gradients.primary.colors`, `theme.colors.onPrimary` (Task 2).
- Produces:
  - `type WidgetAccent = { from: string; to: string; text: string }`, exported from `services/widgetTask.ts`. `WidgetDisplayData` gains `accent?: WidgetAccent`. It travels through the existing `mergeWidgetLastData`, so FCM pushes and the 30-minute task keep it, and `clearWidgetTaskUserInfo` already removes it on logout.
  - `syncAccentToWidget(accent: WidgetAccent): Promise<void>` in `widgets/renderWidgets.tsx`. It returns immediately on non-Android or when the cached `accent` is deep-equal to the new one. Otherwise it calls `mergeWidgetLastData({ accent })` then `renderAllWidgets`, and catches and logs errors like `syncNextCountdownToWidget`.

In `ThemeContext`, once `isLoading` is false, an effect on `[theme]` calls `syncAccentToWidget({ from: theme.gradients.primary.colors[0], to: theme.gradients.primary.colors[1], text: theme.colors.onPrimary })`. This covers theme changes and color-mode changes.

In `PartnerStatusWidget.tsx`, replace `CARD_GRADIENT` with a helper `cardGradient(accent?: WidgetAccent)` that returns `{ from, to, orientation: 'TL_BR' }`. The default when `accent` is undefined is `{ from: '#8859ff', to: '#5a1fff', text: '#ffffff' }`, which is Twilight light. Other changes:
- `#ffffff` text → `accent.text`.
- `#f3edff` / `#f0eaff` text → `accent.text` at 0.9 opacity, as an `rgba(...)` string. `applyOpacity` from `config/theme` is fine if the headless bundle can import it; otherwise inline a 6-line helper.
- `PlaceholderCard` gets an `accent` prop.
- The pill and flower-circle `rgba(255,255,255,…)` backgrounds stay.

- [ ] **Step 1: Add `WidgetAccent` and the `accent` field.**
- [ ] **Step 2: Add `syncAccentToWidget` and call it from `ThemeContext`.**
- [ ] **Step 3: Update `PartnerStatusWidget.tsx`.**
- [ ] **Step 4: Type-check.** Run `npx tsc --noEmit 2>&1 | grep -E "^(widgets/|services/widgetTask|contexts/)"`. Expected: no output.
- [ ] **Step 5: On device**, with both widget sizes on the home screen, pick Sunset. Both widgets turn orange with dark text within a few seconds. Switch to dark mode: the widgets update. Pick Twilight again: the widgets look like today.
- [ ] **Step 6: Commit** `feat(widget): render partner status widget in the user's accent`.

---

### Task 6: Chat, Journal and Home screens

**Files:**
- Modify: `app/(tabs)/Chat/index.tsx:238`
- Modify: `app/(tabs)/Home/Journal/index.tsx:160-175, 320`
- Modify: `app/(tabs)/Home/Journal/[id].tsx:83`
- Modify: `app/(tabs)/Home/Journal/editor.tsx:281`
- Modify: `app/(tabs)/Home/index.tsx:463, 567`
- Check: `components/Message/Message.tsx:90`, which already uses `messageSelf`/`messagePartner`. Make sure the bubble text uses `onPrimary`/`onPartner`.

**Interfaces:**
- Consumes: `theme.colors.primary|onPrimary|onPartner`, `theme.gradients.primary|partner` (Task 2).

Rules for this task and Tasks 7–8:
- Accent fallbacks like `x || '#8B5CF6'` and `x || ['#8B5CF6','#EC4899']` are removed. Use the token directly; the theme is always defined.
- A single accent color becomes `theme.colors.primary`.
- An accent gradient becomes `theme.gradients.primary.colors`.
- Self/partner gradients become `isSelf ? theme.gradients.primary.colors : theme.gradients.partner.colors`. This applies to journal cards (`Journal/index.tsx:163-164`) and the journal entry header (`[id].tsx:83`).
- Text drawn on an accent background uses `onPrimary`, or `onPartner` on partner-colored backgrounds, instead of a hardcoded white.

- [ ] **Step 1: Apply the rules to the files above.**
- [ ] **Step 2: Grep for leftovers.** Run `grep -niE "#8B5CF6|#7C3AED|#EC4899|#3B82F6|#2563EB" "app/(tabs)/Chat/index.tsx" "app/(tabs)/Home/index.tsx" app/\(tabs\)/Home/Journal/*.tsx components/Message/Message.tsx`. Expected: no output.
- [ ] **Step 3: Type-check.** Run `npx tsc --noEmit 2>&1 | grep -c "error TS"`. Expected: ≤ 45.
- [ ] **Step 4: Commit** `refactor(theme): chat, journal and home use accent tokens`.

---

### Task 7: Map and zones

**Files:**
- Modify: `app/(tabs)/Home/Map.tsx:392, 443-445, 464-493, 513, 615-627`
- Modify: `components/AddZoneModal/AddZoneModal.tsx:348, 350, 460, 522, 556, 643`
- Modify: `components/ZoneCard/ZoneCard.tsx:90-96`
- Modify: `components/LocationAndZonesSection/LocationAndZonesSection.tsx:71-72`

**Interfaces:**
- Consumes: `theme.colors.primary|secondary|accentAlt|onPrimary|onPartner` (Task 2).

Same rules as Task 6, plus:
- **Map person markers** (`Map.tsx:443-493`): the user marker is `theme.colors.primary`, and the partner marker is `theme.colors.secondary` (the resolved partner color). This fixes the bug at `:444`, where `gradients.secondary` doesn't exist and the marker always fell back to pink.
- **Zone type colors**, in both the map fill (`Map.tsx:615-627`) and the `ZoneCard` badge: `home` → `theme.colors.primary`, `work` → `theme.colors.accentAlt`, `custom` stays `#10B981`, and other zone badges stay `#6B7280`. Zones belong to the room, not to one partner, so work zones must not take the partner color.
- `AddZoneModal.tsx:643` is in a `StyleSheet.create` block, outside the component, so move that `borderColor` into the inline style where `theme` is in scope.

- [ ] **Step 1: Apply the changes.**
- [ ] **Step 2: Grep.** Run `grep -niE "#8B5CF6|#EC4899|#3B82F6|gradients\?*\.secondary\b" "app/(tabs)/Home/Map.tsx" components/AddZoneModal/AddZoneModal.tsx components/ZoneCard/ZoneCard.tsx components/LocationAndZonesSection/LocationAndZonesSection.tsx`. Expected: no output.
- [ ] **Step 3: Type-check.** Run `npx tsc --noEmit 2>&1 | grep -c "error TS"`. Expected: ≤ 45.
- [ ] **Step 4: Commit** `refactor(theme): map and zones use accent tokens, fix partner marker color`.

---

### Task 8: Countdowns, gradient button, Wishlist and Favorite Things

**Files:**
- Modify: `components/AddCountdownModal/AddCountdownModal.tsx:185, 271, 343, 380`
- Modify: `components/CountdownCard/CountdownCard.tsx:111, 133`
- Modify: `components/CountdownsSection/CountdownsSection.tsx:44, 79, 84`
- Modify: `components/GradientButton/GradientButton.tsx:45-46`
- Modify: `app/(tabs)/Home/Wishlist.tsx:281-284, 401, 589`
- Modify: `app/(tabs)/Home/FavoriteThings.tsx:222-225, 342, 457`

**Interfaces:**
- Consumes: `theme.colors.primary|onPrimary`, `theme.gradients.*` (Task 2).

Same rules as Task 6, plus:
- `GradientButton`: the `['#8B5CF6','#EC4899']` fallback becomes `theme.gradients.primary.colors`. Its label text uses `onPrimary` when the label sits on the accent gradient.
- Wishlist and FavoriteThings: the **"all"** chip and the `|| ['#8B5CF6','#EC4899']` fallbacks for an unknown category become `theme.gradients.primary.colors`. The per-category entries in `categoryGradients` (`activities`, `music`, `movies`, `gifts`, `drinks`, `flowers`, `scents`, `other`, …) **stay as they are**.

- [ ] **Step 1: Apply the changes.**
- [ ] **Step 2: Grep.** Run `grep -niE "#8B5CF6" components/AddCountdownModal components/CountdownCard components/CountdownsSection components/GradientButton "app/(tabs)/Home/Wishlist.tsx" "app/(tabs)/Home/FavoriteThings.tsx"`. Expected: only the `activities`/`gifts` lines inside `categoryGradients` in `Wishlist.tsx`.
- [ ] **Step 3: Type-check.** Run `npx tsc --noEmit 2>&1 | grep -c "error TS"`. Expected: ≤ 45.
- [ ] **Step 4: Commit** `refactor(theme): countdowns, buttons, wishlist and favorites use accent tokens`.

---

### Task 9: Whole-app sweep and device verification

**Files:** any file the sweep turns up.

- [ ] **Step 1: Repo-wide grep.** Run `grep -rniE "#8B5CF6|#7C3AED|#EC4899|#3B82F6|#2563EB|#9d75ff|#5a1fff|#2D3250|#F5E8C7|#7077A1" app components widgets contexts hooks`. Every remaining hit must be a category color (`categoryGradients` in Wishlist/FavoriteThings) or the widget's Twilight default in `PartnerStatusWidget.tsx`. Fix anything else using the Task 6 rules and commit.
- [ ] **Step 2: Type-check.** Run `npx tsc --noEmit 2>&1 | grep -c "error TS"`. Expected: ≤ 45.
- [ ] **Step 3: Device checklist** (spec, Verification). Use two accounts, A and B, in one room. Record pass or fail for each line:
  1. A fresh install, and an existing user with no choice, both show Twilight in light and dark mode, with consistent purple across screens.
  2. A cycles through all six themes in both modes. Check Home, Chat, Journal list and entry, Map (markers and zones), Wishlist, Favorite Things, Countdowns, Calendar, Daily Question, Profile, the tab bar, Gluestack buttons and switches, and both widget sizes. Nothing is left violet/pink, and all text on accents is readable.
  3. A = Rose, B = Ocean. On A, A's bubbles are Rose and B's are Ocean, and B's phone shows the reverse. Then both pick Rose: each sees the partner in peach (Rose alt).
  4. B changes theme while A has Chat open. A's partner bubbles update without a restart.
  5. Relaunch A with Forest set: no purple flash.
  6. A logs out and logs back in as a different account with no theme: Twilight, not Forest. Logging back in as A restores Forest from Firebase.
  7. Reinstall A: Forest comes back after login, and `users/{A}/accentTheme` is still `forest` in the Firebase console.
- [ ] **Step 4: Commit any sweep fixes**: `fix(theme): remaining hardcoded accents`.
