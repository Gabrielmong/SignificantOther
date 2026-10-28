# Daily Question

## Goal

Each day both partners get the same question. Each answers on their own;
the partner's answer stays hidden until you've answered too. Notifications
tell you when your partner answered, when both answers are in, and remind
you in the evening if you haven't answered.

## Why

Most of the app is used when someone feels like it. A shared daily prompt
gives both partners a small reason to open it every day, and the "hidden
until you both answer" rule makes the reply something to look forward to.

## Decisions made during brainstorming

- **Questions:** a built-in list shipped in the app, in **English**. No
  user-written or AI-generated questions.
- **The couple's day:** dates are taken in `America/Costa_Rica` (UTC−6,
  no DST) for both partners, wherever they are.
- **Notifications:** "partner answered", "answers revealed", and a daily
  reminder at **20:00 Costa Rica time**. No widget status.
- **Editing:** an answer can be edited until the partner answers; after
  that both are locked.

## Question selection

- `constants/dailyQuestions.ts` exports `DAILY_QUESTIONS: string[]`,
  about 150 questions mixing light, deep, playful and memory-based prompts
  suitable for a couple.
- `utils/dailyQuestion.ts`:
  - `COUPLE_TIME_ZONE = 'America/Costa_Rica'`.
  - `todayKey(now = Date.now()): string` → `YYYY-MM-DD` in
    `COUPLE_TIME_ZONE`. Costa Rica is a fixed UTC−6 with no DST, so this
    is computed as `new Date(now - 6h)` read with the UTC getters (no
    reliance on `Intl` time-zone support).
  - `questionForDate(dateKey: string): string` → the question at index
    `daysBetween(QUESTION_EPOCH, dateKey) mod DAILY_QUESTIONS.length`, with
    `QUESTION_EPOCH = '2026-01-01'`. Days are counted on the date strings
    (UTC midnight of each), so the result doesn't depend on the device's
    timezone.
- Both phones compute the same question with no server involved.

## Data model

```
rooms/{roomId}/dailyQuestions/{YYYY-MM-DD}: {
  question: string,                       // text as shown that day
  answers: {
    [uid]: { text: string, answeredAt: number, updatedAt?: number }
  }
}
```

- `question` is written with each answer (same value from both phones, so
  the write is idempotent). Editing `DAILY_QUESTIONS` later never changes
  what a past day showed.
- Keys are `YYYY-MM-DD`, so ordering by key is chronological.
- **Visibility is enforced by the app, not the database.** The partner's
  answer is readable in the shared room; the UI simply doesn't show it
  until you've answered (or the day is over).

New types in `types/DailyQuestion.ts`: `DailyAnswer`, `DailyQuestionDay`.

## App components

### 1. Firebase functions (`hooks/useFirebase.tsx`)

- `saveDailyAnswer(roomId, uid, dateKey, question, text)`: `update` on
  `dailyQuestions/{dateKey}` setting `question` and
  `answers/{uid} = { text, answeredAt: now }`. Used for the first answer.
- `editDailyAnswer(roomId, uid, dateKey, text)`: `update` on
  `answers/{uid}` setting `text` and `updatedAt`. Does not touch
  `answeredAt`, so the Cloud Function's `onValueCreated` doesn't fire again.
- `listenToDailyQuestionDay(roomId, dateKey, callback)`: `onValue` on the
  day node; returns the unsubscribe.
- `getDailyQuestionHistory(roomId, limit)`: one-shot
  `query(ref, orderByKey(), limitToLast(limit))`, returned newest first as
  `{ dateKey, day }[]`.

### 2. Hook (`hooks/useDailyQuestion.tsx`)

Owns today's state for the Home card:
- `dateKey` (from `todayKey()`, recomputed when the app returns to the
  foreground so it rolls over at Costa Rica midnight).
- `question` (stored `question` if the day exists, else
  `questionForDate(dateKey)`).
- `myAnswer`, `partnerAnswer`, and derived `status`:
  `'unanswered' | 'waiting' | 'revealed'`.
- `submitAnswer(text)`: first answer → `saveDailyAnswer`; already answered
  and partner hasn't → `editDailyAnswer`; partner has answered → no-op
  (locked). Empty or whitespace-only text is rejected. Max length 500
  characters.

### 3. Home card (`components/DailyQuestionCard/`)

Placed directly under the feeling card (and its `Calendar →` link) on
Home.
- **unanswered:** "Today's question", the question, an **Answer** button
  that opens an answer modal (multiline input, 500-char limit, Save).
- **waiting:** the question, your answer, "Waiting for {partnerName}…",
  and an **Edit** button (same modal, prefilled).
- **revealed:** the question, then "You" and "{partnerName}" with each
  answer.
- **No partner yet:** after answering, shows "Invite your partner to see
  their answer" instead of "Waiting for…".
- Tapping the card (outside the buttons) opens the history screen.

### 4. History screen (`app/(tabs)/Home/DailyQuestion.tsx`)

- Header like the other Home sub-screens (back arrow, title
  `Daily questions`). Added to `TAB_HIDDEN_ROUTES`.
- Lists the last **30** days that have an entry, newest first, from
  `getDailyQuestionHistory(roomId, 30)`. Each item: the date
  (e.g. `Tue, 27 Oct`), the question, then "You" and the partner's answer.
- **Today** follows the same hiding rule as the Home card (partner's
  answer hidden until you've answered). **Past days** always show both
  answers; a missing one shows "didn't answer".
- Pull-to-refresh; empty state "No questions answered yet".

## Cloud Functions (`SignificantOtherCF/functions/src/index.ts`)

Both follow the existing pattern (`onNewJournalEntry`): look up names in
`rooms/{roomId}/users`, tokens in `users/{uid}/fcmtokens`, send with
`admin.messaging().sendEachForMulticast` and the same `android` options.

### `onDailyAnswerCreated`

`onValueCreated` on `rooms/{roomId}/dailyQuestions/{dateKey}/answers/{userId}`.
- Find the other user in the room. If none, stop.
- Read `rooms/{roomId}/dailyQuestions/{dateKey}/answers/{otherUserId}`.
  - **Missing:** notify the other user — title
    `{name} answered today's question 👀`, body `Answer yours to see what
    they said.`
  - **Present:** notify the other user (who answered first) — title
    `You both answered 💬`, body `See what {name} said about today's
    question.`
- Edits don't trigger it (they update `text`, they don't create the node).

### `dailyQuestionReminder`

`onSchedule({ schedule: '0 20 * * *', timeZone: 'America/Costa_Rica' })`.
- Compute today's `YYYY-MM-DD` in Costa Rica time (same rule as the app).
- Read `rooms`; for each room with users, for each user without
  `dailyQuestions/{today}/answers/{uid}`, send title
  `Today's question is waiting 💭`, body `Answer before midnight to see
  your partner's answer.`
- Rooms with no users are skipped. Errors for one room are logged and
  don't stop the others.

Deploying the functions is done by the user (`npm run deploy` in
`SignificantOtherCF/functions`), not as part of implementation.

## Error handling & edge cases

- **Midnight:** the day boundary is Costa Rica midnight. An answer saved
  at 23:59 belongs to that day's question; the card switches to the new
  question when the app next comes to the foreground after midnight.
- **Both answer at the same moment:** each creation triggers the function;
  each may see the other's answer already present and send "You both
  answered" to the other. Acceptable (worst case both get the reveal
  message).
- **Save fails** (offline etc.): Realtime Database queues it and the UI
  shows the answer optimistically from the local listener; no toast unless
  the write rejects, then `Couldn't save your answer`.
- **Editing after the partner answered:** the Edit button is hidden; the
  hook also refuses, in case of a race.
- **Question list shorter than the days elapsed:** wraps around via the
  modulo.

## Testing

No automated tests in the app (no test runner; user's choice). Type-check
with no new errors (`npx tsc --noEmit`: 45 pre-existing). Cloud Functions:
`npm run build` in `SignificantOtherCF/functions` must succeed.

On two phones after deploying the functions:
- Both phones show the same question.
- A answers → B gets "{A} answered…"; B's card still shows only the
  question and the Answer button.
- B answers → A gets "You both answered 💬"; both cards show both answers;
  Edit is gone.
- Before B answers, A can edit; the edit doesn't send another notification.
- History lists today and earlier days; a skipped day shows
  "didn't answer".
- At 20:00 Costa Rica time, whoever hasn't answered gets the reminder.

## Out of scope

- Widget status, user-written or AI questions, Spanish questions, streaks.
- Server-enforced answer privacy.
- Changing the couple's timezone from the app.
