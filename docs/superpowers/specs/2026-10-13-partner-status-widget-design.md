# Partner Status Widget (Android)

## Goal

Add an Android home-screen widget that shows a glance at the user's partner
without opening the app: the partner's selected flower, their message, and
their current feeling. Android only for v1 (iOS WidgetKit requires a native
Swift extension and is a separate, larger effort — out of scope here).

## Why

The user wants to check in on their partner's mood/status from the home
screen, the way the in-app Home screen already surfaces flower + feeling +
message for the partner (`rooms/{roomId}/users/{uid}` in Realtime Database).
A widget extends that same glance to outside the app.

## Constraints discovered during brainstorming

- The widget process runs outside the React Native app's JS runtime; it
  cannot hold a live Firebase listener. It needs either push-triggered or
  periodic updates.
- `SignificantOtherCF` (separate repo, Firebase project `significantother-415f1`,
  deployed) already has `onFlowerUpdated` and `onFeelingUpdated` Cloud
  Functions that fire whenever either field changes and currently send a
  **user-visible** FCM notification to the partner. We extend these rather
  than build new server infrastructure.
- A message containing both `notification` and `data` keys is fully handled
  by the OS notification tray when the app is backgrounded/killed on
  Android — the JS background handler never runs. Only a **data-only**
  message reliably reaches `setBackgroundMessageHandler` in all app states.
  This is why the widget-refresh payload must be a separate
  `sendEachForMulticast` call from the existing notification send.

## Architecture

```
Partner A changes flower/feeling
        │
        ▼
Realtime DB write: rooms/{roomId}/users/{uidA}/selectedFlower|selectedFeeling
        │
        ▼
Cloud Function (onFlowerUpdated / onFeelingUpdated, SignificantOtherCF)
        │  (unchanged) sends user-visible notification to partner B
        │  (new) sends a SEPARATE data-only message to partner B:
        │        { type: 'widget-refresh', flower, message, feeling, partnerName }
        ▼
Partner B's device: FCM background/foreground handler (app/_layout.tsx)
        │
        ▼
Resolve flower/feeling keys to display assets (constants/index.ts maps)
        │
        ▼
Write resolved data into react-native-android-widget's widget store
        │
        ▼
requestWidgetUpdate() → Android redraws the home-screen widget
```

A periodic ~30-minute fallback job (provided by the widget library's Expo
config plugin) re-resolves the same data from a one-shot Firebase read, in
case a push was missed (app offline, token stale, etc.).

## Components

### 1. Cloud Functions changes (`SignificantOtherCF/functions/src/index.ts`)

In both `onFlowerUpdated` and `onFeelingUpdated`, after the existing
`sendEachForMulticast` call that sends the user-visible notification, add a
second call on the same `tokens` list:

```ts
admin.messaging().sendEachForMulticast({
  tokens,
  data: {
    type: 'widget-refresh',
    flower: ownUser.selectedFlower ?? '',
    message: ownUser.message ?? '',
    feeling: ownUser.selectedFeeling ?? '',
    partnerName: ownUser.name ?? '',
  },
});
```

`ownUser` is already available in both functions from the existing
`room.users[userId]` lookup — no extra database read needed, since that
object already contains `selectedFlower`, `message`, and `selectedFeeling`
together as sibling fields.

### 2. Persisted room/partner identity (client)

Wherever the app currently sets `user.roomId` / `partnerId` / `partnerName`
into Redux (`useAuth`, Home screen's room-join flow), also mirror those
three values to AsyncStorage. This is required because a killed-app
background FCM handler and the periodic fallback job cannot read Redux
state — they need their own persisted copy of which room/partner this
device belongs to.

On sign-out, clear this mirrored data (alongside whatever else sign-out
already clears) so a stale widget doesn't show a previous partner's data to
a different account that later signs in on the same device.

### 3. FCM handler (`app/_layout.tsx`)

Add a shared function, e.g. `handleWidgetRefreshMessage(remoteMessage)`:

- Checks `remoteMessage.data?.type === 'widget-refresh'`.
- Resolves `flower` via `FLOWER_MAP` and `feeling` via `FEELINGS_MAP` /
  `FEELING_EMOJIS` (`constants/index.ts`), the same maps `FlowerModal` and
  `FlowerPressable` already use.
- Writes the resolved data into the widget store (library's
  `setWidgetData`-equivalent API).
- Calls `requestWidgetUpdate()`.

Wired into both `setBackgroundMessageHandler` and `onMessage`, replacing
today's log-only bodies for this one message type. Other message types
(existing flower/feeling/message/journal/zone notifications) keep their
current behavior unchanged.

The periodic fallback job runs the same resolution logic, but sources its
input from a one-shot `getFlower`/`getFeeling` call (existing
`hooks/useFirebase.tsx` functions) using the persisted `roomId`/`partnerId`
from AsyncStorage, instead of a push payload.

### 4. Widget UI (`react-native-android-widget`)

- New widget component (e.g. `widgets/PartnerStatusWidget.tsx`), registered
  via the library's Expo config plugin added to `app.config.ts`'s existing
  plugin list (same tuple-or-string pattern as `@react-native-firebase/messaging`,
  `expo-location`, etc.).
- Single fixed widget size for v1 (no resizable layouts).
- Layout: partner's flower image, their message text beneath it, feeling
  emoji/label in a corner.
- Empty/first-run state (no data ever written, or partner has no
  flower/feeling selected yet): neutral placeholder text ("Waiting for an
  update…") instead of a broken image.
- Tapping the widget opens the app to the Home screen, via the library's
  `clickAction` intent support.

## Error handling & edge cases

- Partner has never selected a flower/feeling (new room): placeholder
  state, same as first-run.
- Receiving device's FCM token missing/stale: the data push silently fails
  to deliver, same failure mode as the existing notification push today.
  The periodic fallback poll is what recovers in this case — no additional
  handling needed.
- Sign-out: mirrored AsyncStorage room/partner data is cleared.

## Testing

- **Cloud Functions**: verify via local Firebase emulator (or existing
  `firebase-functions-test` setup, if present) that both functions issue
  two separate `sendEachForMulticast` calls with the expected payload
  shapes when a flower/feeling value changes.
- **Client (manual, matches this app's existing testing bar)**:
  - Change flower/feeling on device A; confirm device B's widget updates
    within a few seconds.
  - Force-kill device B's app, repeat; confirm the widget still updates
    (proves the background handler path, not just foreground `onMessage`).
  - Put device B in airplane mode, change on device A, bring B back online;
    confirm the periodic fallback eventually catches the update.

## Explicitly out of scope (v1)

- iOS widget (WidgetKit/SwiftUI extension) — separate future effort.
- Showing the user's own flower/feeling/message on the widget (partner-only
  per design decision).
- Resizable/multiple widget sizes.
- Any new server infrastructure beyond extending the two existing Cloud
  Functions (no new Cloud Functions, no Blaze-plan changes — the project is
  already on a plan that supports Cloud Functions).
