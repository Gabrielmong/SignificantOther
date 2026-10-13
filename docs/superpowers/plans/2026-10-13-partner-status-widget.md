# Partner Status Widget (Android) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Android home-screen widget that shows the partner's selected flower, their message, and their feeling, kept fresh by a silent FCM push from an existing Cloud Function plus a native periodic fallback refresh.

**Architecture:** Two repositories are touched. `SignificantOtherCF` (Firebase Cloud Functions, already deployed) gains a second, data-only `sendEachForMulticast` call in its existing `onFlowerUpdated`/`onFeelingUpdated` triggers. The main app (`SignificantOther`) gains: (1) AsyncStorage-persisted room/partner identity (mirroring the existing `services/locationTask.ts` pattern) so a killed-app background task can know whose data to show; (2) an FCM handler that writes incoming widget data to AsyncStorage and asks Android to redraw the widget; (3) a `react-native-android-widget`-based widget component + task handler that renders from that persisted data, with Android's own `updatePeriodMillis` native timer providing the periodic fallback (no separate background-fetch task needed).

**Tech Stack:** React Native (Expo, bare `android/` project), `@react-native-firebase/messaging`, `@react-native-async-storage/async-storage`, `react-native-android-widget` (new dependency), Firebase Realtime Database, Firebase Cloud Functions (TypeScript, `firebase-functions` v4, `firebase-admin` v11).

**Spec:** `docs/superpowers/specs/2026-10-13-partner-status-widget-design.md`

## Global Constraints

- Android only for v1 — no iOS widget work (per spec).
- The widget shows the **partner's** flower/message/feeling only, never the user's own (per spec's design decision).
- A push to the partner must be a **separate** `sendEachForMulticast` call with **only** a `data` payload (no `notification` key) — mixing both means Android's OS tray swallows it and the JS background handler never runs (per spec's discovered FCM constraint).
- No new server infrastructure beyond extending the two existing Cloud Functions — do not create new Cloud Functions, do not change the Firebase billing plan (per spec's explicit out-of-scope item).
- This codebase has no automated test runner in either repository (confirmed: no `jest`/`vitest` in `SignificantOther/package.json`; `firebase-functions-test` is an unused devDependency in `SignificantOtherCF/functions/package.json` with no test script or test files). The established verification bar across this whole app is `npx tsc --noEmit` plus manual device/emulator verification — follow that pattern here rather than introducing a new test framework as a side effect of this feature.
- Follow the exact AsyncStorage persistence pattern already established in `services/locationTask.ts` (`setXTaskUserInfo`/`getXTaskUserInfo`/`clearXTaskUserInfo`, each wrapped in try/catch with `console.log`/`console.error`) for the new `services/widgetTask.ts`.

## Review Focus

- Partner has never selected a flower/feeling (brand-new room): the widget must show the placeholder state, not a broken image or crash — exercised in Task 5.
- The FCM background/foreground handler receives a message whose `data.type` is anything other than `'widget-refresh'` (every other existing message type: flower/feeling/message/journal/zone notifications): existing log-only behavior must be unchanged, not swallowed by the new branch — exercised in Task 7.
- A different account signs in on a device that previously had another account's partner data cached: sign-out must clear the persisted widget identity so the widget doesn't show a stale/wrong partner until the new account's data arrives — exercised in Task 2.
- The widget is added to the home screen (or the periodic/system `WIDGET_UPDATE` fires) before the signed-in user has ever joined a room, i.e. no `roomId` persisted yet: the task handler must render the placeholder state, not throw — exercised in Task 6.
- The Cloud Function fires on a single-user room (e.g. the initial flower write at room creation, before a partner has joined) where `otherUserId` lookup returns `undefined`: the existing early-return must still short-circuit before the new data-payload send is reached, so the new code path doesn't introduce a crash on that already-handled edge case — exercised in Task 1.

---

## File Structure

**Repo: `SignificantOtherCF`** (`C:\Users\gabri\OneDrive\projects\SignificantOtherCF`)
- Modify: `functions/src/index.ts` — add the data-only push in `onFlowerUpdated` and `onFeelingUpdated`.

**Repo: `SignificantOther`** (`c:\Users\gabri\OneDrive\projects\SignificantOther`, this project)
- Create: `services/widgetTask.ts` — AsyncStorage persistence for room/partner identity and last-known widget display data (mirrors `services/locationTask.ts`).
- Modify: `hooks/useAuth.tsx` — persist widget task info alongside the existing location task info; clear it on sign-out.
- Modify: `package.json`, `app.config.ts` — add `react-native-android-widget` dependency and its Expo config plugin.
- Create: `widgets/PartnerStatusWidget.tsx` — the widget's JSX layout (flower image, message, feeling, placeholder state).
- Create: `widgets/widgetTaskHandler.ts` — the registered native task handler (renders on add/periodic-update/click, does the one-shot Firebase fallback read).
- Modify: `index.js` — register the widget task handler at app entry.
- Modify: `app/_layout.tsx` — add the `widget-refresh` FCM data-message handler, wired into both `setBackgroundMessageHandler` and `onMessage`.

---

### Task 1: Cloud Functions — send a silent widget-refresh data payload

**Repo:** `SignificantOtherCF`

**Files:**
- Modify: `functions/src/index.ts:1-50` (`onFlowerUpdated`) and the analogous block in `onFeelingUpdated` (same file, further down)

**Interfaces:**
- Produces: an FCM data-only message with `data: { type: 'widget-refresh', flower: string, message: string, feeling: string, partnerName: string }`, sent to the same `tokens` array the existing notification call already resolves.

- [ ] **Step 1: Add the data-only send to `onFlowerUpdated`**

Open `functions/src/index.ts`. Inside `onFlowerUpdated`, the existing code (inside the innermost `usersRef.once('value', (snapshot) => { ... })` callback) ends with the existing `admin.messaging().sendEachForMulticast({ tokens, notification: {...}, android: {...} })` call's `.then()/.catch()`. Immediately after that `.catch()` block closes (still inside the same `usersRef.once` callback, so `tokens`, `ownUser`, and `otherUser` are in scope), add:

```ts
        admin
          .messaging()
          .sendEachForMulticast({
            tokens,
            data: {
              type: 'widget-refresh',
              flower: ownUser.selectedFlower ?? '',
              message: ownUser.message ?? '',
              feeling: ownUser.selectedFeeling ?? '',
              partnerName: ownUser.name ?? '',
            },
          })
          .then((response) => {
            logger.debug(`Widget refresh push sent: ${JSON.stringify(response)}`);
          })
          .catch((error) => {
            logger.error(`Error sending widget refresh push: ${JSON.stringify(error)}`);
          });
```

Note this is a **second, separate** `sendEachForMulticast` call — do not merge the `data` field into the existing notification-bearing call, and do not add a `notification` key to this new call.

- [ ] **Step 2: Add the same block to `onFeelingUpdated`**

`onFeelingUpdated` has the identical structure (same `usersRef.once` callback shape, same `ownUser`/`otherUser`/`tokens` variables in scope, already computing `const feeling = ownUser.selectedFeeling;` just above its existing `sendEachForMulticast` call). Add the same block as Step 1 immediately after that function's existing `.catch()` closes.

- [ ] **Step 3: Type-check and lint**

Run (from `C:\Users\gabri\OneDrive\projects\SignificantOtherCF\functions`):
```
npm run build
npm run lint
```
Expected: both exit 0 with no errors. `npm run build` is `tsc` (per `package.json`), so this is the project's real compile check — treat any TS error as something to fix before continuing.

- [ ] **Step 4: Verify against the emulator**

From `C:\Users\gabri\OneDrive\projects\SignificantOtherCF`, run:
```
firebase emulators:start --only functions,database
```
In a second terminal, use the emulator's Database UI (printed in the emulator output, typically `http://localhost:4000/database`) to manually write a `selectedFlower` value under a test path matching `rooms/{roomId}/users/{userId}/selectedFlower`, where `rooms/{roomId}/users` already has two synthetic user entries each with a `name` field and the other user having a `fcmtokens` array/object with at least one dummy token string. Confirm in the emulator's Functions logs that **two** `sendEachForMulticast` calls are logged for `onFlowerUpdated`: the existing notification send and the new `Widget refresh push sent` debug line. Repeat for `selectedFeeling` against `onFeelingUpdated`.

This also exercises the Review Focus item about single-user rooms: write `selectedFlower` under a room whose `users` object has only one entry, and confirm the function logs `No other user found in room {roomId}, skipping notification` and does **not** attempt either `sendEachForMulticast` call (the existing early-return already guards this — confirm it still does after your edit, since both sends sit inside the same guarded block).

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\gabri\OneDrive\projects\SignificantOtherCF"
git add functions/src/index.ts
git commit -m "feat: send silent widget-refresh push alongside flower/feeling notifications"
```

- [ ] **Step 6: Deploy**

```bash
firebase deploy --only functions
```
Confirm the deploy completes without errors. (This is a live, already-deployed project — deploying is how the later app-side tasks get real pushes to test against.)

---

### Task 2: Persist widget room/partner identity (AsyncStorage)

**Repo:** `SignificantOther`

**Files:**
- Create: `services/widgetTask.ts`
- Modify: `hooks/useAuth.tsx:325-345` (the `setRoom`/`setLocationTaskUserInfo` block) and `hooks/useAuth.tsx:99-110` (the `signOut`/`clearLocationTaskUserInfo` block)

**Interfaces:**
- Produces: `setWidgetTaskUserInfo(userId: string, roomId: string, partnerId: string, partnerName: string): Promise<void>`, `getWidgetTaskUserInfo(): Promise<{ userId: string | null; roomId: string | null; partnerId: string | null; partnerName: string | null }>`, `clearWidgetTaskUserInfo(): Promise<void>`, `setWidgetLastData(data: { flower: string; message: string; feeling: string; partnerName: string; updatedAt: number }): Promise<void>`, `getWidgetLastData(): Promise<{ flower: string; message: string; feeling: string; partnerName: string; updatedAt: number } | null>`. Consumed by Task 3 (sign-in flow), Task 6 (widget task handler), and Task 7 (FCM handler).

- [ ] **Step 1: Create `services/widgetTask.ts`**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_ID_KEY = '@widget_task_user_id';
const ROOM_ID_KEY = '@widget_task_room_id';
const PARTNER_ID_KEY = '@widget_task_partner_id';
const PARTNER_NAME_KEY = '@widget_task_partner_name';
const LAST_DATA_KEY = '@widget_task_last_data';

export type WidgetDisplayData = {
  flower: string;
  message: string;
  feeling: string;
  partnerName: string;
  updatedAt: number;
};

// Function to set user/room/partner info for the widget task handler
export const setWidgetTaskUserInfo = async (
  userId: string,
  roomId: string,
  partnerId: string,
  partnerName: string,
) => {
  try {
    await AsyncStorage.multiSet([
      [USER_ID_KEY, userId],
      [ROOM_ID_KEY, roomId],
      [PARTNER_ID_KEY, partnerId],
      [PARTNER_NAME_KEY, partnerName],
    ]);
    console.log('Widget task user info saved:', { userId, roomId, partnerId, partnerName });
  } catch (error) {
    console.error('Error saving widget task user info:', error);
  }
};

// Function to get user/room/partner info from storage
export const getWidgetTaskUserInfo = async (): Promise<{
  userId: string | null;
  roomId: string | null;
  partnerId: string | null;
  partnerName: string | null;
}> => {
  try {
    const values = await AsyncStorage.multiGet([
      USER_ID_KEY,
      ROOM_ID_KEY,
      PARTNER_ID_KEY,
      PARTNER_NAME_KEY,
    ]);
    return {
      userId: values[0][1],
      roomId: values[1][1],
      partnerId: values[2][1],
      partnerName: values[3][1],
    };
  } catch (error) {
    console.error('Error getting widget task user info:', error);
    return { userId: null, roomId: null, partnerId: null, partnerName: null };
  }
};

// Function to clear user/room/partner info (e.g., on logout)
export const clearWidgetTaskUserInfo = async () => {
  try {
    await AsyncStorage.multiRemove([USER_ID_KEY, ROOM_ID_KEY, PARTNER_ID_KEY, PARTNER_NAME_KEY, LAST_DATA_KEY]);
    console.log('Widget task user info cleared');
  } catch (error) {
    console.error('Error clearing widget task user info:', error);
  }
};

// Function to persist the last-known widget display data (written by both
// the FCM push handler and the widget task handler's fallback read)
export const setWidgetLastData = async (data: WidgetDisplayData) => {
  try {
    await AsyncStorage.setItem(LAST_DATA_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving widget last data:', error);
  }
};

// Function to read the last-known widget display data
export const getWidgetLastData = async (): Promise<WidgetDisplayData | null> => {
  try {
    const raw = await AsyncStorage.getItem(LAST_DATA_KEY);
    return raw ? (JSON.parse(raw) as WidgetDisplayData) : null;
  } catch (error) {
    console.error('Error getting widget last data:', error);
    return null;
  }
};
```

- [ ] **Step 2: Wire `setWidgetTaskUserInfo` into the room-join flow**

In `hooks/useAuth.tsx`, find the block around line 326-343 (inside the function that builds `roomFields` and calls `setLocationTaskUserInfo`):

```ts
          if (roomData) {
            const roomFields: RoomPayload = {
              partnerId: Object.keys(roomData.users).find((id) => id !== user?.uid) || '',
              roomId: data.roomId,
              partnerName:
                roomData.users[Object.keys(roomData.users).find((id) => id !== user?.uid) || '']
                  .name,
            };

            dispatch(setRoom(roomFields));

            dispatch(updateUser(updatedFields));

            // Set location task user info for background tracking
            if (user?.uid && data.roomId) {
              setLocationTaskUserInfo(user.uid, data.roomId);
            }
          }
```

Add the widget task call right after the location one:

```ts
            // Set location task user info for background tracking
            if (user?.uid && data.roomId) {
              setLocationTaskUserInfo(user.uid, data.roomId);
            }

            // Set widget task user info so the home-screen widget's
            // background handler/task can resolve the right partner
            if (user?.uid && data.roomId && roomFields.partnerId) {
              setWidgetTaskUserInfo(
                user.uid,
                data.roomId,
                roomFields.partnerId,
                roomFields.partnerName,
              );
            }
```

Add the import at the top of the file, alongside the existing `locationTask` import:

```ts
import {
  setLocationTaskUserInfo,
  clearLocationTaskUserInfo,
} from '../services/locationTask';
import { setWidgetTaskUserInfo, clearWidgetTaskUserInfo } from '../services/widgetTask';
```

- [ ] **Step 3: Wire `clearWidgetTaskUserInfo` into sign-out**

In `hooks/useAuth.tsx`, find the sign-out block around line 99-108:

```ts
    return auth.signOut().then(async () => {
      dispatch(stateLogout());
      await clearLocationTaskUserInfo();

      showToast({
```

Add the widget clear call:

```ts
    return auth.signOut().then(async () => {
      dispatch(stateLogout());
      await clearLocationTaskUserInfo();
      await clearWidgetTaskUserInfo();

      showToast({
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors in `services/widgetTask.ts` or `hooks/useAuth.tsx` compared to the pre-existing baseline (this project has pre-existing unrelated errors elsewhere — confirm you haven't added to the count in these two files specifically, e.g. via `npx tsc --noEmit 2>&1 | grep -E "widgetTask.ts|useAuth.tsx"`).

- [ ] **Step 5: Manually verify the sign-out clear (Review Focus item)**

With a dev client running on an emulator/device: sign in, let the room-join flow run (confirm via a log line `Widget task user info saved: {...}` in Metro's console), then sign out and confirm the log line `Widget task user info cleared` appears. This confirms the persisted identity doesn't survive a sign-out, which matters once a second account could sign in on the same device.

- [ ] **Step 6: Commit**

```bash
git add services/widgetTask.ts hooks/useAuth.tsx
git commit -m "feat: persist widget task room/partner identity to AsyncStorage"
```

---

### Task 3: Install and configure `react-native-android-widget`

**Repo:** `SignificantOther`

**Files:**
- Modify: `package.json` (new dependency)
- Modify: `app.config.ts:48-72` (plugins array)

**Interfaces:**
- Produces: the `react-native-android-widget` native module and Expo config plugin wired in, providing `registerWidgetTaskHandler`, `requestWidgetUpdate`, and the `FlexWidget`/`TextWidget`/`ImageWidget` JSX primitives consumed by Task 4 and Task 6.

- [ ] **Step 1: Install the package**

```bash
npx expo install react-native-android-widget
```

- [ ] **Step 2: Confirm the installed API surface**

Run: `cat node_modules/react-native-android-widget/lib/index.d.ts` (or open it in the editor). Confirm it exports `registerWidgetTaskHandler`, `requestWidgetUpdate`, and the widget JSX primitives (`FlexWidget`, `TextWidget`, `ImageWidget`) with the shapes assumed in Tasks 4 and 6 below. If a name or signature differs from what's used in those tasks (library versions do shift these occasionally), adjust the code in those tasks to match what's actually installed — note the discrepancy in your Task 4/6 commit message if you had to adjust anything.

- [ ] **Step 3: Add the Expo config plugin**

In `app.config.ts`, add a widget preview image placeholder asset path and the plugin entry. First, in the `plugins` array (currently lines 48-72), add after `'@rnmapbox/maps'`:

```ts
    [
      'react-native-android-widget',
      {
        widgets: [
          {
            name: 'PartnerStatus',
            label: 'Partner Status',
            description: "Shows your partner's flower, message, and feeling",
            minWidth: '220dp',
            minHeight: '110dp',
            targetCellWidth: 3,
            targetCellHeight: 2,
            updatePeriodMillis: 1800000,
          },
        ],
      },
    ],
```

(`1800000` ms = 30 minutes — Android enforces this as the effective minimum regardless of a lower configured value, per the spec's periodic-fallback decision.)

- [ ] **Step 4: Rebuild the native dev client**

This is a native config change — Metro's JS-only hot reload is not enough. Rebuild:
```bash
npx expo prebuild --platform android
npm run android
```
Expected: the build succeeds and installs on the connected emulator/device (same verification bar established earlier in this project for native build changes — if you hit a Gradle `generateAutolinking*` directory-delete failure here, that's the known OneDrive-sync file-lock issue already resolved for this project; re-run rather than re-diagnosing).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json app.config.ts
git commit -m "feat: add react-native-android-widget dependency and config plugin"
```

---

### Task 4: Widget UI component

**Repo:** `SignificantOther`

**Files:**
- Create: `widgets/PartnerStatusWidget.tsx`

**Interfaces:**
- Consumes: `FlexWidget`/`TextWidget`/`ImageWidget` from `react-native-android-widget` (Task 3); `FLOWER_MAP`, `FEELING_EMOJIS`, `FEELINGS_LABELS` from `constants/index.ts`; `WidgetDisplayData` type from `services/widgetTask.ts` (Task 2).
- Produces: `PartnerStatusWidget(props: { data: WidgetDisplayData | null })` — a widget-library JSX component, rendered by Task 6's task handler via `renderWidget(<PartnerStatusWidget data={...} />)`.

- [ ] **Step 1: Write the component**

```tsx
import { FlexWidget, TextWidget, ImageWidget } from 'react-native-android-widget';
import { FLOWER_MAP, FEELING_EMOJIS, FEELINGS_LABELS } from '../constants';
import { WidgetDisplayData } from '../services/widgetTask';

interface PartnerStatusWidgetProps {
  data: WidgetDisplayData | null;
}

export function PartnerStatusWidget({ data }: PartnerStatusWidgetProps) {
  if (!data || !data.flower) {
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: '#1a1a1a',
          borderRadius: 16,
          padding: 12,
          justifyContent: 'center',
          alignItems: 'center',
        }}
        clickAction="OPEN_APP">
        <TextWidget
          text="Waiting for an update…"
          style={{ fontSize: 13, color: '#b0b0b0', textAlign: 'center' }}
        />
      </FlexWidget>
    );
  }

  const flowerImage = FLOWER_MAP[data.flower];
  const feelingEmoji = FEELING_EMOJIS[data.feeling] || '';
  const feelingLabel = FEELINGS_LABELS[data.feeling] || data.feeling;

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
      }}
      clickAction="OPEN_APP">
      {flowerImage && (
        <ImageWidget
          image={flowerImage}
          imageWidth={48}
          imageHeight={48}
          style={{ marginRight: 10, borderRadius: 24 }}
        />
      )}
      <FlexWidget style={{ flexDirection: 'column', flexGrow: 1 }}>
        <TextWidget
          text={data.partnerName || 'Partner'}
          style={{ fontSize: 13, color: '#ffffff', fontWeight: '600' }}
        />
        {!!data.message && (
          <TextWidget
            text={data.message}
            style={{ fontSize: 12, color: '#d0d0d0', marginTop: 2 }}
          />
        )}
        {!!data.feeling && (
          <TextWidget
            text={`${feelingEmoji} ${feelingLabel}`.trim()}
            style={{ fontSize: 12, color: '#b0b0b0', marginTop: 2 }}
          />
        )}
      </FlexWidget>
    </FlexWidget>
  );
}
```

`clickAction="OPEN_APP"` is the library's built-in action for "tapping the widget opens the host app" — confirm this exact string/prop name against the type defs checked in Task 3 Step 2; if the installed version instead expects a registered custom click action name, use that mechanism to open the app's Home route instead.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep "PartnerStatusWidget"`
Expected: no output (no errors specific to this new file — pre-existing unrelated errors elsewhere in the project are not in scope here).

- [ ] **Step 3: Commit**

```bash
git add widgets/PartnerStatusWidget.tsx
git commit -m "feat: add PartnerStatusWidget component"
```

---

### Task 5: Widget task handler (render + periodic fallback read)

**Repo:** `SignificantOther`

**Files:**
- Create: `widgets/widgetTaskHandler.ts`

**Interfaces:**
- Consumes: `PartnerStatusWidget` (Task 4); `getWidgetTaskUserInfo`, `getWidgetLastData`, `setWidgetLastData`, `WidgetDisplayData` (Task 2); `registerWidgetTaskHandler` type from `react-native-android-widget` (Task 3).
- Produces: `widgetTaskHandler` (default export), registered in Task 6's `index.js` edit.

- [ ] **Step 1: Write the handler**

```ts
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { getDatabase, ref as databaseRef, get } from 'firebase/database';
import { PartnerStatusWidget } from './PartnerStatusWidget';
import {
  getWidgetTaskUserInfo,
  getWidgetLastData,
  setWidgetLastData,
  WidgetDisplayData,
} from '../services/widgetTask';

const NAME_TO_WIDGET: Record<string, (props: { data: WidgetDisplayData | null }) => JSX.Element> =
  {
    PartnerStatus: PartnerStatusWidget,
  };

async function refreshFromFirebase(): Promise<WidgetDisplayData | null> {
  const { roomId, partnerId, partnerName } = await getWidgetTaskUserInfo();

  if (!roomId || !partnerId) {
    return null;
  }

  try {
    const db = getDatabase();
    const partnerRef = databaseRef(db, `rooms/${roomId}/users/${partnerId}`);
    const snapshot = await get(partnerRef);

    if (!snapshot.exists()) {
      return null;
    }

    const partnerData = snapshot.val();
    const data: WidgetDisplayData = {
      flower: partnerData.selectedFlower || '',
      message: partnerData.message || '',
      feeling: partnerData.selectedFeeling || '',
      partnerName: partnerName || '',
      updatedAt: Date.now(),
    };

    await setWidgetLastData(data);
    return data;
  } catch (error) {
    console.error('Widget task: error refreshing from Firebase:', error);
    return null;
  }
}

export default async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const Widget = NAME_TO_WIDGET[props.widgetInfo.widgetName];

  if (!Widget) {
    return;
  }

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      // Render immediately from whatever we have cached, for a fast first paint...
      const cached = await getWidgetLastData();
      props.renderWidget(<Widget data={cached} />);

      // ...then refresh from Firebase (this is the periodic fallback: Android
      // invokes WIDGET_UPDATE on its own updatePeriodMillis timer) and
      // re-render if anything changed.
      const fresh = await refreshFromFirebase();
      if (fresh) {
        props.renderWidget(<Widget data={fresh} />);
      }
      break;
    }

    case 'WIDGET_DELETED':
      break;

    case 'WIDGET_CLICK':
      break;

    default:
      break;
  }
}
```

Cross-check `WidgetTaskHandlerProps`'s exact shape (`widgetInfo.widgetName` vs. a differently-named field, the exact `widgetAction` string union) against the type defs you checked in Task 3 Step 2, and adjust field names here to match if they differ.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep "widgetTaskHandler.ts"`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add widgets/widgetTaskHandler.ts
git commit -m "feat: add widget task handler with Firebase fallback refresh"
```

---

### Task 6: Register the task handler and verify the empty/placeholder state

**Repo:** `SignificantOther`

**Files:**
- Modify: `index.js`

**Interfaces:**
- Consumes: `widgetTaskHandler` default export (Task 5); `registerWidgetTaskHandler` from `react-native-android-widget` (Task 3).

- [ ] **Step 1: Register the handler**

```js
'use strict';
exports.__esModule = true;
require('expo-router/entry');

const { registerWidgetTaskHandler } = require('react-native-android-widget');
const widgetTaskHandler = require('./widgets/widgetTaskHandler').default;

registerWidgetTaskHandler(widgetTaskHandler);
```

- [ ] **Step 2: Rebuild and add the widget to the home screen with no signed-in session**

Since this registration is native-entry-point level, no JS-only reload is needed for this specific change (the handler function itself can update via Fast Refresh once registered), but if this is the first time after Task 3's prebuild you're testing the widget picker, confirm the dev client is already the one built in Task 3 Step 4.

On the emulator/device, **before** signing into the app (or after a fresh install with no cached AsyncStorage data), long-press the home screen → Widgets → find "Partner Status" → add it. Confirm it renders the **placeholder state** ("Waiting for an update…") rather than crashing or showing a broken image — this is the Review Focus item for a never-joined-a-room state, since `getWidgetTaskUserInfo()` returns all-null and `refreshFromFirebase` short-circuits to `null`.

- [ ] **Step 3: Verify placeholder clears after sign-in**

Sign in and let the room-join flow run (per Task 2). Within the ~30 minute native update window — or by removing and re-adding the widget to force a fresh `WIDGET_ADDED` event — confirm the widget now shows real partner data (assuming the partner has already selected a flower/feeling; if not, it correctly stays on the placeholder, which is also the Review Focus item for "partner never selected a flower/feeling").

- [ ] **Step 4: Commit**

```bash
git add index.js
git commit -m "feat: register widget task handler at app entry"
```

---

### Task 7: FCM handler — push-triggered widget refresh

**Repo:** `SignificantOther`

**Files:**
- Modify: `app/_layout.tsx:57-67`

**Interfaces:**
- Consumes: `setWidgetLastData`, `WidgetDisplayData` from `services/widgetTask.ts` (Task 2); `requestWidgetUpdate` from `react-native-android-widget` (Task 3); `PartnerStatusWidget` (Task 4).
- Produces: `handleWidgetRefreshMessage`, called from both `setBackgroundMessageHandler` and `onMessage`.

- [ ] **Step 1: Add the shared handler function**

In `app/_layout.tsx`, add imports alongside the existing ones:

```ts
import { requestWidgetUpdate } from 'react-native-android-widget';
import { PartnerStatusWidget } from '../widgets/PartnerStatusWidget';
import { setWidgetLastData, WidgetDisplayData } from '../services/widgetTask';
```

Add the shared handler function, above the three `messaging()...` calls at the bottom of the file:

```ts
async function handleWidgetRefreshMessage(remoteMessage: { data?: Record<string, string> }) {
  if (remoteMessage.data?.type !== 'widget-refresh') {
    return false;
  }

  const data: WidgetDisplayData = {
    flower: remoteMessage.data.flower || '',
    message: remoteMessage.data.message || '',
    feeling: remoteMessage.data.feeling || '',
    partnerName: remoteMessage.data.partnerName || '',
    updatedAt: Date.now(),
  };

  await setWidgetLastData(data);

  await requestWidgetUpdate({
    widgetName: 'PartnerStatus',
    renderWidget: () => <PartnerStatusWidget data={data} />,
    widgetNotFound: () => {
      console.log('PartnerStatus widget not found on home screen, skipping render');
    },
  });

  return true;
}
```

- [ ] **Step 2: Wire it into both handlers, preserving existing behavior for every other message type**

Replace:

```ts
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('Message handled in the background!', remoteMessage);
});

messaging().onMessage(async (remoteMessage) => {
  console.log('Message handled in the foreground!', remoteMessage);
});
```

With:

```ts
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  const handled = await handleWidgetRefreshMessage(remoteMessage);
  if (!handled) {
    console.log('Message handled in the background!', remoteMessage);
  }
});

messaging().onMessage(async (remoteMessage) => {
  const handled = await handleWidgetRefreshMessage(remoteMessage);
  if (!handled) {
    console.log('Message handled in the foreground!', remoteMessage);
  }
});
```

Leave `onNotificationOpenedApp` untouched — the widget-refresh message is data-only (no `notification` key), so it never produces a tappable system notification and `onNotificationOpenedApp` never fires for it.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep "_layout.tsx"`
Expected: no new errors in this file beyond the pre-existing baseline.

- [ ] **Step 4: Verify existing message types are unaffected (Review Focus item)**

With the dev client running, trigger any *other* existing notification-producing action (e.g. send a Journal entry with `notifyPartner: true` on device A) and confirm device B's Metro console still logs `Message handled in the background!`/`Message handled in the foreground!` as before — i.e. the new branch's `data?.type !== 'widget-refresh'` check correctly falls through to existing behavior rather than swallowing other message types.

- [ ] **Step 5: Commit**

```bash
git add "app/_layout.tsx"
git commit -m "feat: handle widget-refresh FCM data messages"
```

---

### Task 8: End-to-end verification

**Repo:** both (no new files)

- [ ] **Step 1: Live push-triggered update, foregrounded**

Device A and device B both signed in, in the same room, both apps open. On device A, open the Home screen and change the selected flower (or feeling). Within a few seconds, confirm device B's widget (visible on its home screen) updates to the new flower/message or feeling — this exercises Task 1's Cloud Function change end-to-end through Task 7's foreground `onMessage` path.

- [ ] **Step 2: Live push-triggered update, app killed**

Force-stop device B's app entirely (not just backgrounded — use Android's app-info "Force stop", or swipe it away from recents, which on most Android versions still allows a data-only FCM message to invoke the background handler; if your test device aggressively kills background work, confirm via the OEM's battery-optimization settings that the app is exempted, matching how the existing location-tracking feature already requires this). On device A, change the flower/feeling again. Confirm device B's widget updates without the user having opened the app — this is the specific proof that the background handler path (not just foreground) works, per the spec's testing section.

- [ ] **Step 3: Periodic fallback**

Put device B in airplane mode. On device A, change the flower/feeling. Bring device B back online. Either wait for the native ~30-minute `updatePeriodMillis` cycle, or remove-and-re-add the widget to force an immediate `WIDGET_ADDED` event, and confirm the widget catches up to the missed change via the `refreshFromFirebase` fallback read in Task 5's handler.

- [ ] **Step 4: Final commit**

If any fixes were needed during end-to-end verification, commit them individually with descriptive messages following the pattern of the earlier tasks. No separate "final" commit is needed if nothing changed.
