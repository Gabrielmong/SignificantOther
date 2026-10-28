# Daily Question Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give both partners the same question each day, hide the partner's answer until you've answered, keep a 30-day history, and notify on "partner answered", "both answered", and an 8 pm reminder.

**Architecture:** The question of the day is picked on the device from a built-in list by counting days since a fixed epoch in Costa Rica time (UTC−6, no DST), so both phones agree without a server. Answers live at `rooms/{roomId}/dailyQuestions/{YYYY-MM-DD}`; a hook listens to today's node and drives a Home card, and a Home sub-screen shows history. Two Cloud Functions in the separate `SignificantOtherCF` repo send the notifications.

**Tech Stack:** Expo SDK 54, expo-router 6 (typed routes on), React Native 0.81, gluestack-ui, Firebase Realtime Database web SDK (app), firebase-functions 4.8 v2 (`database`, `scheduler`) + firebase-admin (Cloud Functions). No automated tests (user's choice): verification is type-checking, `npm run build` for the functions, and the device checklist in Task 6.

**Spec:** `docs/superpowers/specs/2026-10-27-daily-question-design.md`

## Global Constraints

- App repo: `C:/Users/gabri/OneDrive/projects/SignificantOther`, work directly on `main`. Functions repo: `C:/Users/gabri/OneDrive/projects/SignificantOtherCF`, work directly on its `main`.
- Do **not** commit anything under `docs/superpowers/`. Only `git add` the files each task lists. Never `git add` anything under `.expo/` or `functions/lib/`.
- Do **not** deploy Cloud Functions (`npm run deploy` / `firebase deploy`). The user deploys.
- Questions are in English. Couple's day = `America/Costa_Rica` = fixed UTC−6 (no DST). `QUESTION_EPOCH = '2026-01-01'`.
- Data path: `rooms/{roomId}/dailyQuestions/{YYYY-MM-DD}: { question: string, answers: { [uid]: { text, answeredAt, updatedAt? } } }`.
- Answers: trimmed, non-empty, max **500** characters. Editable until the partner has answered, then locked.
- Card copy: label `Today's question`; buttons `Answer`, `Edit`; waiting `Waiting for {partnerName}…`; no partner `Invite your partner to see their answer`; link `Past questions →`.
- History: title `Daily questions`; last **30** days, newest first; empty state `No questions answered yet`; a missing answer on a past day shows `didn't answer`.
- Save failure toast title: `Couldn't save your answer`.
- Notifications (exact text):
  - partner hasn't answered: title `{name} answered today's question 👀`, body `Answer yours to see what they said.`
  - partner already answered: title `You both answered 💬`, body `See what {name} said about today's question.`
  - reminder at `0 20 * * *` in `America/Costa_Rica`: title `Today's question is waiting 💭`, body `Answer before midnight to see your partner's answer.`
- App `npx tsc --noEmit` reports **45** errors before this work; it must stay 45 (except the typed-route case in Task 4).
- Commit messages end with a blank line then `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Device timezone ≠ Costa Rica** (a phone set to another zone, or someone travelling): both phones must still show the same question and the same date key. Handled in Task 1 (`todayKey`/`questionForDate` use only UTC arithmetic with a fixed −6 h offset; no local-time getters).
2. **Saving while offline:** the Realtime Database `update()` promise doesn't resolve until the server acks, so the answer modal must not wait on it. Handled in Task 3 (the modal closes immediately; the local listener shows the answer optimistically).
3. **Editing must not re-notify:** an edit updates `text`/`updatedAt` on an existing node, so `onValueCreated` must not fire. Handled in Task 2 (`editDailyAnswer` updates the answer's children, never recreates it).
4. **The app open across Costa Rica midnight:** the card must move to the new question when the app returns to the foreground. Handled in Task 2 (AppState listener recomputes `dateKey`).
5. **The reminder must not download every room's messages/whiteboard:** it reads the `users` node and only `dailyQuestions/{today}/answers` per room. Handled in Task 5.

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `types/DailyQuestion.ts` | Create | `DailyAnswer`, `DailyQuestionDay` |
| `types/index.ts` | Modify | Re-export |
| `constants/dailyQuestions.ts` | Create | `DAILY_QUESTIONS` list |
| `utils/dailyQuestion.ts` | Create | `todayKey`, `questionForDate`, `formatDateKey`, `MAX_ANSWER_LENGTH` |
| `hooks/useFirebase.tsx` | Modify | Save/edit/listen/history functions |
| `hooks/useDailyQuestion.tsx` | Create | Today's state + `submitAnswer` |
| `hooks/index.ts` | Modify | Export the hook |
| `components/DailyQuestionCard/` | Create | Home card + answer modal |
| `components/index.ts` | Modify | Export the card |
| `app/(tabs)/Home/index.tsx` | Modify | Render the card |
| `app/(tabs)/Home/DailyQuestion.tsx` | Create | History screen |
| `constants/index.ts` | Modify | Hide tab bar on the history screen |
| `SignificantOtherCF/functions/src/index.ts` | Modify | Two new functions |

---

### Task 1: Questions, types and date helpers

**Files:**
- Create: `types/DailyQuestion.ts`
- Modify: `types/index.ts`
- Create: `constants/dailyQuestions.ts`
- Create: `utils/dailyQuestion.ts`

**Interfaces:**
- Produces:
  - `type DailyAnswer = { text: string; answeredAt: number; updatedAt?: number }`, `type DailyQuestionDay = { question?: string; answers?: { [uid: string]: DailyAnswer } }` (from `types`).
  - `DAILY_QUESTIONS: string[]` (from `constants/dailyQuestions`).
  - From `utils/dailyQuestion.ts`: `MAX_ANSWER_LENGTH = 500`, `todayKey(now?: number): string`, `questionForDate(dateKey: string): string`, `formatDateKey(dateKey: string): string`.

- [ ] **Step 1: Types**

Create `types/DailyQuestion.ts`:
```ts
// rooms/{roomId}/dailyQuestions/{YYYY-MM-DD}
export type DailyAnswer = {
  text: string;
  answeredAt: number;
  updatedAt?: number;
};

export type DailyQuestionDay = {
  question?: string;
  answers?: { [uid: string]: DailyAnswer };
};
```
Append to `types/index.ts`:
```ts
export * from './DailyQuestion';
```

- [ ] **Step 2: The question list**

Create `constants/dailyQuestions.ts`:
```ts
// Built-in daily questions. Both phones pick the same one by date (see
// utils/dailyQuestion.ts), so only append to this list — reordering or
// removing items changes which question future days get.
export const DAILY_QUESTIONS: string[] = [
  "What's a small thing I did recently that made you smile?",
  'What was your favorite moment we shared this week?',
  "If we could teleport anywhere for dinner tonight, where would we go?",
  'What song reminds you of us, and why?',
  "What's something you've never told me but have always wanted to?",
  'What did you first notice about me?',
  "What's a dream you haven't said out loud yet?",
  'Which of our trips would you relive if you could?',
  'What makes you feel most loved by me?',
  "What's one thing you'd like us to try together this year?",
  "What's your favorite memory of us from the beginning?",
  'What would your perfect lazy Sunday with me look like?',
  "What's a habit of mine you secretly find cute?",
  'What are you most proud of yourself for lately?',
  'If our relationship had a theme song, what would it be?',
  "What's something that's been on your mind today?",
  'What do you think we do really well as a team?',
  "What's a food that always reminds you of me?",
  'When did you know you were falling for me?',
  "What's one thing I could do this week to make your life easier?",
  'What was the best part of your day today?',
  "What's a place you want to show me that I haven't seen?",
  'What would you want our home to feel like in ten years?',
  'Which movie or show should we watch together next?',
  "What's something you've learned from me?",
  'What scares you a little about the future, and how can I help?',
  'What makes you laugh the hardest about us?',
  'If you could give your younger self one piece of advice, what would it be?',
  "What's a tradition you'd like us to start?",
  'What do you miss most when we are apart?',
  "What's your favorite way to spend an evening together?",
  'What compliment from me do you remember most?',
  "What's a goal you'd like us to work on together?",
  'What smell instantly reminds you of me?',
  "What's the silliest argument we've ever had?",
  'What do you appreciate about me that you rarely say?',
  'If we had a free day with no plans, what would you want to do?',
  "What's a childhood memory that shaped who you are?",
  "What's something you're looking forward to this month?",
  'What would be your ideal date night right now?',
  'Which of my friends or family do you feel closest to, and why?',
  "What's one thing that always cheers you up on a bad day?",
  'What do you think our love language is as a couple?',
  "What's a photo of us you love, and what was happening when it was taken?",
  'What would you name our hypothetical pet?',
  "What's a skill you'd love us to learn together?",
  'What part of your routine do you wish I joined more often?',
  'What made you feel cared for this week?',
  "What's something you're grateful for today?",
  'If we wrote a book about us, what would the first chapter be called?',
  'What would you like more of in our relationship?',
  "What's a small luxury that makes you happy?",
  'What city would you want to live in with me for a year?',
  "What's the most spontaneous thing you'd like us to do?",
  'What did you dream about recently?',
  "What's a song you've had on repeat lately?",
  'What do you think is my superpower?',
  "What's the best gift you've ever received?",
  'What does home mean to you?',
  'What was your favorite thing about today?',
  'What would you want to tell me if you knew I would not reply?',
  "What's one way I've helped you grow?",
  'What would our perfect vacation itinerary look like?',
  "What's a food you want us to cook together?",
  "What's a moment you felt really proud of me?",
  "What's something that made you nervous recently?",
  'Which season feels most like us, and why?',
  "What's your favorite thing to do when you have the house to yourself?",
  "What's a question you've always wanted to ask me?",
  'How do you like to be comforted when you are sad?',
  "What's an adventure on your bucket list?",
  "What's a little thing you do that you hope I notice?",
  'What do you think we will laugh about in twenty years?',
  'What was your first impression of my family?',
  "What's one word you'd use to describe us right now?",
  "What's something new you'd like to learn this year?",
  'What does a perfect morning look like for you?',
  "What's a memory of us you think about often?",
  'Which fictional couple do we remind you of?',
  "What's something that always makes you think of home?",
  'If you could relive one day from this year, which would it be?',
  "What's a way you'd like me to surprise you?",
  'What do you need more of from me lately?',
  "What's your favorite thing about the way I love you?",
  "What's a fear you've overcome?",
  "What's the most romantic thing you can imagine?",
  'What would you do with an extra hour every day?',
  'What is something you are still figuring out about yourself?',
  "What's a dish that tastes like your childhood?",
  'Which of our inside jokes is your favorite?',
  'How do you recharge after a long week?',
  "What's something you wish more people knew about you?",
  "What's a movie that made you cry?",
  'What did you want to be when you grew up?',
  "What's a place where you feel completely at peace?",
  'What would you want our wedding or anniversary celebration to feel like?',
  'What made you smile today?',
  "What's a hobby you'd like to pick back up?",
  'What do you admire most about your parents?',
  'What would your ideal birthday look like?',
  "What's one thing you'd change about our weekly routine?",
  "What's a risk you're glad you took?",
  'What does being a good partner mean to you?',
  "What's something about me that surprised you?",
  "What's your favorite way I say I love you?",
  "What's a book or article that changed how you think?",
  'What would you do if you won a small lottery tomorrow?',
  "What's a memory with your best friend that still makes you laugh?",
  'Where do you see us in five years?',
  "What's something you'd like us to stop doing?",
  "What's a moment you felt really understood by me?",
  "What's your comfort movie or show?",
  'What is one boundary that is important to you?',
  "What's a chore you secretly don't mind doing?",
  'What would you want to teach our future kids or pets?',
  "What's the kindest thing a stranger has done for you?",
  'If you could have dinner with anyone, who would it be?',
  "What's a sound that makes you happy?",
  "What's something you want to celebrate this week?",
  'How has your idea of love changed over time?',
  "What's a challenge we got through together that made us stronger?",
  "What's an outfit of mine you love?",
  'What would make tomorrow a great day for you?',
  "What's your favorite thing we've built or created together?",
  "What's a word or phrase I say that you've picked up?",
  'What was the hardest part of your week?',
  "What's something you're excited to share with me?",
  'If you could master any instrument, which would it be?',
  "What's your favorite rainy-day activity?",
  "What's a promise you'd like to make to me?",
  "What's your favorite thing about where we live?",
  "What's something I do that makes you feel safe?",
  'Which trip should we plan next?',
  'What would you want to be remembered for?',
  "What's a little ritual of ours you never want to lose?",
  'What do you think I worry about most?',
  "What's the best advice you've ever gotten?",
  "What's a memory from this month you want to keep?",
  'What would a perfect day apart and then together look like?',
  "What's something you want to say thank you for?",
  "What's a guilty pleasure you're happy to admit?",
  'What do you hope never changes between us?',
  'What made you feel brave recently?',
  "What's something that's easier because you have me?",
  'What would you write in a note to me today?',
  "What's your favorite thing about mornings with me?",
  'If we started a small business together, what would it be?',
  "What's something you'd like to do for your family this year?",
  "What's the best thing that happened to you this month?",
  'What are three words you would use to describe me?',
  "What's a dream date we haven't had yet?",
  'What do you love most about our life right now?',
];
```

- [ ] **Step 3: Date helpers**

Create `utils/dailyQuestion.ts`:
```ts
import { DAILY_QUESTIONS } from '../constants/dailyQuestions';

export const MAX_ANSWER_LENGTH = 500;

// The couple's day follows America/Costa_Rica, which is UTC−6 all year (no
// daylight saving). Working in UTC with a fixed offset keeps both phones on
// the same date and question whatever timezone they are set to.
const COUPLE_UTC_OFFSET_MS = -6 * 60 * 60 * 1000;
const QUESTION_EPOCH = '2026-01-01';
const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (value: number) => String(value).padStart(2, '0');

const dateKeyToUtc = (dateKey: string): number => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
};

/**
 * Today's date in the couple's timezone.
 * @param now - Current time (timestamp), injectable for testing
 * @returns The date as YYYY-MM-DD
 */
export const todayKey = (now: number = Date.now()): string => {
  const date = new Date(now + COUPLE_UTC_OFFSET_MS);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

/**
 * The built-in question for a date, cycling through the list.
 * @param dateKey - Date as YYYY-MM-DD
 */
export const questionForDate = (dateKey: string): string => {
  const days = Math.round((dateKeyToUtc(dateKey) - dateKeyToUtc(QUESTION_EPOCH)) / DAY_MS);
  const count = DAILY_QUESTIONS.length;
  return DAILY_QUESTIONS[((days % count) + count) % count];
};

/**
 * History heading for a date, e.g. "Tue, 27 Oct".
 */
export const formatDateKey = (dateKey: string): string => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};
```
Do not add this file to `utils/index.ts`; import it by path.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"` → expected `45`.
Run: `npx tsc --noEmit 2>&1 | grep -E "^(types/|constants/|utils/dailyQuestion)"` → expected no output.

- [ ] **Step 5: Commit**

```bash
git add types/DailyQuestion.ts types/index.ts constants/dailyQuestions.ts utils/dailyQuestion.ts
git commit -m "feat: add daily question list and date helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Firebase functions and the `useDailyQuestion` hook

**Files:**
- Modify: `hooks/useFirebase.tsx` (database import near line 12; new functions after `getFeelingHistoryMonth`; return object)
- Create: `hooks/useDailyQuestion.tsx`
- Modify: `hooks/index.ts`

**Interfaces:**
- Consumes: `DailyAnswer`, `DailyQuestionDay` (types); `todayKey`, `questionForDate`, `MAX_ANSWER_LENGTH` (Task 1).
- Produces:
  - From `useFirebase()`:
    - `saveDailyAnswer(roomId: string, uid: string, dateKey: string, question: string, text: string): Promise<void>`
    - `editDailyAnswer(roomId: string, uid: string, dateKey: string, text: string): Promise<void>`
    - `listenToDailyQuestionDay(roomId: string, dateKey: string, callback: (day: DailyQuestionDay | null) => void): () => void`
    - `getDailyQuestionHistory(roomId: string, limit: number): Promise<{ dateKey: string; day: DailyQuestionDay }[]>` (newest first)
  - `useDailyQuestion({ roomId, userId, partnerId, saveDailyAnswer, editDailyAnswer, listenToDailyQuestionDay, showToast })` returns `{ dateKey: string; question: string; myAnswer: DailyAnswer | null; partnerAnswer: DailyAnswer | null; status: DailyQuestionStatus; submitAnswer: (text: string) => Promise<boolean> }`, with `type DailyQuestionStatus = 'unanswered' | 'waiting' | 'revealed'` exported from the hook file.

- [ ] **Step 1: Firebase functions**

In `hooks/useFirebase.tsx`, add `query`, `orderByKey`, `limitToLast` to the `firebase/database` import list (after `push,`). Add `DailyQuestionDay` to the `../types` import list.

Directly after the `getFeelingHistoryMonth` function, add:
```ts
  const saveDailyAnswer = async (
    roomId: string,
    uid: string,
    dateKey: string,
    question: string,
    text: string,
  ) => {
    const dayRef = databaseRef(db, `rooms/${roomId}/dailyQuestions/${dateKey}`);

    // Store the question with the answer so editing the built-in list never
    // changes what a past day showed. Creating answers/{uid} triggers the
    // partner notification Cloud Function.
    await update(dayRef, {
      question,
      [`answers/${uid}`]: { text, answeredAt: Date.now() },
    });
  };

  const editDailyAnswer = async (roomId: string, uid: string, dateKey: string, text: string) => {
    const answerRef = databaseRef(db, `rooms/${roomId}/dailyQuestions/${dateKey}/answers/${uid}`);

    // Updates children of the existing node, so the "answer created" Cloud
    // Function does not fire again.
    await update(answerRef, { text, updatedAt: Date.now() });
  };

  const listenToDailyQuestionDay = (
    roomId: string,
    dateKey: string,
    callback: (day: DailyQuestionDay | null) => void,
  ) => {
    const dayRef = databaseRef(db, `rooms/${roomId}/dailyQuestions/${dateKey}`);

    return onValue(dayRef, (snapshot) => {
      callback(snapshot.val());
    });
  };

  const getDailyQuestionHistory = async (
    roomId: string,
    limit: number,
  ): Promise<{ dateKey: string; day: DailyQuestionDay }[]> => {
    const historyQuery = query(
      databaseRef(db, `rooms/${roomId}/dailyQuestions`),
      orderByKey(),
      limitToLast(limit),
    );
    const snapshot = await get(historyQuery);
    const data = (snapshot.val() || {}) as { [dateKey: string]: DailyQuestionDay };

    return Object.entries(data)
      .map(([dateKey, day]) => ({ dateKey, day }))
      .sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  };
```
In the returned object, after `getFeelingHistoryMonth,`, add:
```ts
    saveDailyAnswer,
    editDailyAnswer,
    listenToDailyQuestionDay,
    getDailyQuestionHistory,
```

- [ ] **Step 2: The hook**

Create `hooks/useDailyQuestion.tsx`:
```tsx
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { DailyAnswer, DailyQuestionDay } from '../types';
import { MAX_ANSWER_LENGTH, questionForDate, todayKey } from '../utils/dailyQuestion';

export type DailyQuestionStatus = 'unanswered' | 'waiting' | 'revealed';

interface UseDailyQuestionProps {
  roomId: string | null;
  userId: string | null;
  partnerId: string | null;
  saveDailyAnswer: (
    roomId: string,
    uid: string,
    dateKey: string,
    question: string,
    text: string,
  ) => Promise<void>;
  editDailyAnswer: (roomId: string, uid: string, dateKey: string, text: string) => Promise<void>;
  listenToDailyQuestionDay: (
    roomId: string,
    dateKey: string,
    callback: (day: DailyQuestionDay | null) => void,
  ) => () => void;
  showToast: (options: { title: string; description: string; status: 'success' | 'error' }) => void;
}

export const useDailyQuestion = ({
  roomId,
  userId,
  partnerId,
  saveDailyAnswer,
  editDailyAnswer,
  listenToDailyQuestionDay,
  showToast,
}: UseDailyQuestionProps) => {
  const [dateKey, setDateKey] = useState(() => todayKey());
  const [day, setDay] = useState<DailyQuestionDay | null>(null);

  // Move to the next question when the app returns after the couple's midnight.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setDateKey(todayKey());
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    setDay(null);
    if (!roomId) return;

    const unsubscribe = listenToDailyQuestionDay(roomId, dateKey, setDay);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, dateKey]);

  const question = day?.question || questionForDate(dateKey);
  const myAnswer = userId ? (day?.answers?.[userId] ?? null) : null;
  const partnerAnswer = partnerId ? (day?.answers?.[partnerId] ?? null) : null;
  const status: DailyQuestionStatus = !myAnswer
    ? 'unanswered'
    : partnerAnswer
      ? 'revealed'
      : 'waiting';

  const submitAnswer = useCallback(
    async (text: string): Promise<boolean> => {
      const answer = text.trim().slice(0, MAX_ANSWER_LENGTH);
      if (!roomId || !userId || !answer) return false;

      // Answers lock once the partner has answered.
      if (partnerAnswer) return false;

      try {
        if (myAnswer) {
          await editDailyAnswer(roomId, userId, dateKey, answer);
        } else {
          await saveDailyAnswer(roomId, userId, dateKey, question, answer);
        }
        return true;
      } catch (error) {
        console.error('Error saving daily answer:', error);
        showToast({
          title: "Couldn't save your answer",
          description: 'Please try again',
          status: 'error',
        });
        return false;
      }
    },
    [
      roomId,
      userId,
      dateKey,
      question,
      myAnswer,
      partnerAnswer,
      saveDailyAnswer,
      editDailyAnswer,
      showToast,
    ],
  );

  return { dateKey, question, myAnswer, partnerAnswer, status, submitAnswer };
};
```

- [ ] **Step 3: Export the hook**

Open `hooks/index.ts`, follow its existing export style, and add an export for `useDailyQuestion` (e.g. `export * from './useDailyQuestion';` if the file uses `export *`, otherwise the matching named-export line).

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"` → expected `45`.
Run: `npx tsc --noEmit 2>&1 | grep -E "^hooks/(useDailyQuestion|index)"` → expected no output. (`hooks/useFirebase.tsx` has no pre-existing errors; it must still have none: `npx tsc --noEmit 2>&1 | grep -E "^hooks/useFirebase"` → no output.)

- [ ] **Step 5: Commit**

```bash
git add hooks/useFirebase.tsx hooks/useDailyQuestion.tsx hooks/index.ts
git commit -m "feat: add daily question data functions and hook

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Home card

**Files:**
- Create: `components/DailyQuestionCard/DailyQuestionCard.tsx`, `components/DailyQuestionCard/index.ts`
- Modify: `components/index.ts`
- Modify: `app/(tabs)/Home/index.tsx` (`useFirebase()` destructuring; hook call next to `useFeelings`; card after the feeling card `Box`; a navigation handler next to `handleCalendarPress`)

**Interfaces:**
- Consumes: `useDailyQuestion` + `DailyQuestionStatus` (Task 2); `saveDailyAnswer`, `editDailyAnswer`, `listenToDailyQuestionDay` from `useFirebase()`; `MAX_ANSWER_LENGTH` (Task 1); `DailyAnswer` (types).
- Produces: `DailyQuestionCard` props `{ question: string; status: DailyQuestionStatus; myAnswer: DailyAnswer | null; partnerAnswer: DailyAnswer | null; partnerName: string; hasPartner: boolean; onSubmit: (text: string) => void; onOpenHistory: () => void }`. Route push target `/(tabs)/Home/DailyQuestion` (screen created in Task 4).

- [ ] **Step 1: Create the card**

Create `components/DailyQuestionCard/DailyQuestionCard.tsx`:
```tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  Text,
} from '@gluestack-ui/themed';
import { TextInput, TouchableOpacity } from 'react-native';
import { useAppTheme } from '../../hooks';
import { DailyQuestionStatus } from '../../hooks/useDailyQuestion';
import { DailyAnswer } from '../../types';
import { MAX_ANSWER_LENGTH } from '../../utils/dailyQuestion';

interface DailyQuestionCardProps {
  question: string;
  status: DailyQuestionStatus;
  myAnswer: DailyAnswer | null;
  partnerAnswer: DailyAnswer | null;
  partnerName: string;
  hasPartner: boolean;
  onSubmit: (text: string) => void;
  onOpenHistory: () => void;
}

function AnswerModal({
  isOpen,
  question,
  initialText,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  question: string;
  initialText: string;
  onClose: () => void;
  onSave: (text: string) => void;
}) {
  const { theme } = useAppTheme();
  const [text, setText] = useState(initialText);

  useEffect(() => {
    if (isOpen) setText(initialText);
  }, [isOpen, initialText]);

  const canSave = text.trim().length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalBackdrop onPress={onClose} />
      <ModalContent>
        <ModalCloseButton onPress={onClose} />
        <ModalHeader>
          <Text
            style={{
              fontSize: theme.fontSize.md,
              fontWeight: theme.fontWeight.semibold,
              color: theme.colors.text,
              paddingRight: theme.spacing[6],
            }}>
            {question}
          </Text>
        </ModalHeader>
        <ModalBody>
          <TextInput
            value={text}
            onChangeText={setText}
            multiline
            maxLength={MAX_ANSWER_LENGTH}
            placeholder="Your answer"
            placeholderTextColor={theme.colors.textTertiary}
            autoFocus
            style={{
              minHeight: 120,
              textAlignVertical: 'top',
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.md,
              padding: theme.spacing[3],
              color: theme.colors.text,
              backgroundColor: theme.colors.inputBackground,
              fontSize: theme.fontSize.md,
            }}
          />
          <Text
            style={{
              fontSize: theme.fontSize.xs,
              color: theme.colors.textTertiary,
              textAlign: 'right',
              marginTop: theme.spacing[1],
            }}>
            {`${text.length}/${MAX_ANSWER_LENGTH}`}
          </Text>
        </ModalBody>
        <Button
          onPress={() => onSave(text)}
          isDisabled={!canSave}
          style={{
            width: '100%',
            backgroundColor: theme.colors.primary,
            opacity: canSave ? 1 : 0.5,
          }}>
          <Text
            style={{
              color: theme.colors.white,
              fontSize: theme.fontSize.md,
              fontWeight: theme.fontWeight.semibold,
            }}>
            Save
          </Text>
        </Button>
      </ModalContent>
    </Modal>
  );
}

// Home card for today's shared question. The partner's answer stays hidden
// until the user has answered too.
export const DailyQuestionCard = ({
  question,
  status,
  myAnswer,
  partnerAnswer,
  partnerName,
  hasPartner,
  onSubmit,
  onOpenHistory,
}: DailyQuestionCardProps) => {
  const { theme } = useAppTheme();
  const [modalOpen, setModalOpen] = useState(false);

  const handleSave = (text: string) => {
    if (!text.trim()) return;
    // Close straight away: offline saves only resolve once synced, and the
    // local listener already shows the answer.
    setModalOpen(false);
    onSubmit(text);
  };

  const answerBlock = (label: string, text: string) => (
    <Box style={{ marginTop: theme.spacing[3] }}>
      <Text
        style={{
          fontSize: theme.fontSize.xs,
          fontWeight: theme.fontWeight.semibold,
          color: theme.colors.textSecondary,
        }}>
        {label}
      </Text>
      <Text style={{ fontSize: theme.fontSize.md, color: theme.colors.text, marginTop: 2 }}>
        {text}
      </Text>
    </Box>
  );

  const actionButton = (title: string) => (
    <TouchableOpacity
      onPress={() => setModalOpen(true)}
      style={{
        alignSelf: 'flex-start',
        marginTop: theme.spacing[3],
        paddingVertical: theme.spacing[2],
        paddingHorizontal: theme.spacing[4],
        borderRadius: theme.radii.full,
        backgroundColor: theme.colors.primary,
      }}>
      <Text
        style={{
          color: theme.colors.white,
          fontSize: theme.fontSize.sm,
          fontWeight: theme.fontWeight.semibold,
        }}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onOpenHistory}
        style={{
          width: '100%',
          padding: theme.commonSpacing.cardPaddingCompact,
          borderRadius: theme.radii.lg,
          backgroundColor: theme.colors.surface,
          ...theme.shadows.sm,
        }}>
        <Text
          style={{
            fontSize: theme.fontSize.xs,
            fontWeight: theme.fontWeight.semibold,
            color: theme.colors.primary,
          }}>
          Today's question
        </Text>
        <Text
          style={{
            fontSize: theme.fontSize.lg,
            fontWeight: theme.fontWeight.semibold,
            color: theme.colors.text,
            marginTop: theme.spacing[1],
          }}>
          {question}
        </Text>

        {status === 'unanswered' && actionButton('Answer')}

        {status === 'waiting' && myAnswer && (
          <>
            {answerBlock('You', myAnswer.text)}
            <Text
              style={{
                fontSize: theme.fontSize.sm,
                color: theme.colors.textSecondary,
                marginTop: theme.spacing[3],
              }}>
              {hasPartner
                ? `Waiting for ${partnerName}…`
                : 'Invite your partner to see their answer'}
            </Text>
            {actionButton('Edit')}
          </>
        )}

        {status === 'revealed' && myAnswer && partnerAnswer && (
          <>
            {answerBlock('You', myAnswer.text)}
            {answerBlock(partnerName, partnerAnswer.text)}
          </>
        )}

        <Text
          style={{
            fontSize: theme.fontSize.sm,
            fontWeight: theme.fontWeight.semibold,
            color: theme.colors.primary,
            alignSelf: 'flex-end',
            marginTop: theme.spacing[3],
          }}>
          Past questions →
        </Text>
      </TouchableOpacity>

      <AnswerModal
        isOpen={modalOpen}
        question={question}
        initialText={myAnswer?.text ?? ''}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </>
  );
};
```
If `theme.colors.inputBackground` or `theme.commonSpacing.cardPaddingCompact` don't exist on the theme type, use `theme.colors.surface` / `theme.spacing[5]` instead and note it in the report (both exist in `config/theme` today).

Create `components/DailyQuestionCard/index.ts`:
```ts
export * from './DailyQuestionCard';
```
Append to `components/index.ts`:
```ts
export * from './DailyQuestionCard';
```

- [ ] **Step 2: Wire it into Home**

In `app/(tabs)/Home/index.tsx`:
- Add `useDailyQuestion` to the `../../../hooks` import list, and `DailyQuestionCard` to the `../../../components` import list.
- In the `useFirebase()` destructuring, after `logFeelingHistory,` add:
```ts
    saveDailyAnswer,
    editDailyAnswer,
    listenToDailyQuestionDay,
```
- Directly after the `useFeelings({ ... })` call, add:
```tsx
  const dailyQuestion = useDailyQuestion({
    roomId: user.roomId || null,
    userId: user.uid || null,
    partnerId: partnerId || null,
    saveDailyAnswer,
    editDailyAnswer,
    listenToDailyQuestionDay,
    showToast,
  });
```
- Directly after the `handleCalendarPress` `useCallback`, add:
```tsx
  const handleDailyQuestionHistoryPress = useCallback(() => {
    router.push('/(tabs)/Home/DailyQuestion');
  }, []);
```
- Directly after the closing `</Box>` of the `{/* Feeling Card - Full Width */}` block (the one containing the `Calendar →` link), add:
```tsx
                {/* Daily Question */}
                <DailyQuestionCard
                  question={dailyQuestion.question}
                  status={dailyQuestion.status}
                  myAnswer={dailyQuestion.myAnswer}
                  partnerAnswer={dailyQuestion.partnerAnswer}
                  partnerName={partnerName || 'Partner'}
                  hasPartner={!!partnerId}
                  onSubmit={dailyQuestion.submitAnswer}
                  onOpenHistory={handleDailyQuestionHistoryPress}
                />
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"`. Expected `45`, or `46` where the extra error is only the typed route `'/(tabs)/Home/DailyQuestion'` (the screen arrives in Task 4). Confirm with `npx tsc --noEmit 2>&1 | grep -E "^components/DailyQuestion"` → no output. `app/(tabs)/Home/index.tsx` already has pre-existing errors (at the `loadFlowerData`/`loadFeelingData` calls, a `No overload matches` call, `GradientCard` props and `CountdownsSection` props); the only new error allowed there is the `router.push('/(tabs)/Home/DailyQuestion')` typed-route line.

- [ ] **Step 4: Commit**

```bash
git add components/DailyQuestionCard components/index.ts "app/(tabs)/Home/index.tsx"
git commit -m "feat: add daily question card to home

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: History screen

**Files:**
- Create: `app/(tabs)/Home/DailyQuestion.tsx`
- Modify: `constants/index.ts`

**Interfaces:**
- Consumes: `getDailyQuestionHistory(roomId, limit)` from `useFirebase()` (Task 2); `todayKey`, `formatDateKey` (Task 1); `DailyQuestionDay` (types); `useAppSelector` → `state.room.partnerId`, `state.room.partnerName`.
- Produces: route `/(tabs)/Home/DailyQuestion`.

- [ ] **Step 1: Create the screen**

Create `app/(tabs)/Home/DailyQuestion.tsx`:
```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Box, HStack, Heading, Text } from '@gluestack-ui/themed';
import { RefreshControl, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useAppTheme, useAppToast, useAuth, useFirebase } from '../../../hooks';
import { AnimatedHeartLoader } from '../../../components';
import { useAppSelector } from '../../../state';
import { DailyQuestionDay } from '../../../types';
import { formatDateKey, todayKey } from '../../../utils/dailyQuestion';

const HISTORY_DAYS = 30;

type HistoryItem = { dateKey: string; day: DailyQuestionDay };

export default function DailyQuestionHistory() {
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const { showToast } = useAppToast();
  const { getDailyQuestionHistory } = useFirebase();
  const { partnerId, partnerName } = useAppSelector((state) => state.room);

  const roomId = user.roomId || null;
  const userId = user.uid || null;
  const partnerLabel = partnerName || 'Partner';

  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!roomId) {
      setItems([]);
      return;
    }

    try {
      setItems(await getDailyQuestionHistory(roomId, HISTORY_DAYS));
    } catch (error) {
      console.error('Error loading daily questions:', error);
      setItems((prev) => prev ?? []);
      showToast({
        title: "Couldn't load past questions",
        description: 'Pull down to try again',
        status: 'error',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const today = todayKey();

  const answerRow = (label: string, text: string, muted: boolean) => (
    <Box style={{ marginTop: theme.spacing[2] }}>
      <Text
        style={{
          fontSize: theme.fontSize.xs,
          fontWeight: theme.fontWeight.semibold,
          color: theme.colors.textSecondary,
        }}>
        {label}
      </Text>
      <Text
        style={{
          fontSize: theme.fontSize.md,
          color: muted ? theme.colors.textTertiary : theme.colors.text,
          fontStyle: muted ? 'italic' : 'normal',
        }}>
        {text}
      </Text>
    </Box>
  );

  return (
    <Box style={{ flex: 1, backgroundColor: theme?.colors?.background }}>
      <StatusBar
        backgroundColor={theme?.colors?.background}
        style={theme?.colorMode === 'dark' ? 'light' : 'dark'}
      />

      {/* Header */}
      <Box
        style={{
          paddingTop: 16,
          paddingHorizontal: 16,
          paddingBottom: 16,
          backgroundColor: theme?.colors?.surface,
          ...theme?.shadows?.sm,
        }}>
        <HStack style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color={theme?.colors?.text} />
          </TouchableOpacity>
          <Heading
            style={{
              fontSize: theme?.fontSize?.xl,
              fontWeight: theme?.fontWeight?.bold,
              color: theme?.colors?.text,
            }}>
            Daily questions
          </Heading>
          <Box style={{ width: 24 }} />
        </HStack>
      </Box>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }>
        {items === null ? (
          <Box style={{ paddingVertical: 60, alignItems: 'center' }}>
            <AnimatedHeartLoader />
          </Box>
        ) : items.length === 0 ? (
          <Text
            style={{
              fontSize: theme.fontSize.md,
              color: theme.colors.textSecondary,
              textAlign: 'center',
              paddingVertical: 60,
            }}>
            No questions answered yet
          </Text>
        ) : (
          items.map(({ dateKey, day }) => {
            const isToday = dateKey === today;
            const mine = userId ? day.answers?.[userId] : undefined;
            const theirs = partnerId ? day.answers?.[partnerId] : undefined;

            // Today follows the same rule as the Home card; past days are over,
            // so both answers show.
            let partnerText = theirs?.text ?? (isToday ? 'Not answered yet' : "didn't answer");
            let partnerMuted = !theirs;
            if (isToday && theirs && !mine) {
              partnerText = 'Answered — answer yours to see it';
              partnerMuted = true;
            }

            return (
              <Box
                key={dateKey}
                style={{
                  padding: 16,
                  borderRadius: theme.radii.lg,
                  backgroundColor: theme.colors.surface,
                  ...theme.shadows.sm,
                }}>
                <Text
                  style={{
                    fontSize: theme.fontSize.xs,
                    fontWeight: theme.fontWeight.semibold,
                    color: theme.colors.primary,
                  }}>
                  {isToday ? 'Today' : formatDateKey(dateKey)}
                </Text>
                <Text
                  style={{
                    fontSize: theme.fontSize.md,
                    fontWeight: theme.fontWeight.semibold,
                    color: theme.colors.text,
                    marginTop: 2,
                  }}>
                  {day.question ?? ''}
                </Text>
                {answerRow(
                  'You',
                  mine?.text ?? (isToday ? 'Not answered yet' : "didn't answer"),
                  !mine,
                )}
                {!!partnerId && answerRow(partnerLabel, partnerText, partnerMuted)}
              </Box>
            );
          })
        )}
      </ScrollView>
    </Box>
  );
}
```

- [ ] **Step 2: Hide the tab bar there**

In `constants/index.ts`, add `'/Home/DailyQuestion',` to `TAB_HIDDEN_ROUTES` directly after `'/Home/Countdowns',`.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -c "error TS"` → expected `45`. If it is `46` and the extra error is only the typed route `'/(tabs)/Home/DailyQuestion'` in `app/(tabs)/Home/index.tsx`, regenerate route types and re-check:
```bash
timeout 90 npx expo start --offline --port 8082 >/dev/null 2>&1; npx tsc --noEmit 2>&1 | grep -c "error TS"
```
Expected after regeneration: `45`. If it still reports only that line, record it and continue. Never `git add` `.expo/`.
Run: `npx tsc --noEmit 2>&1 | grep -E "^(app/\(tabs\)/Home/DailyQuestion|constants/)"` → expected no output.

- [ ] **Step 4: Commit**

```bash
git add "app/(tabs)/Home/DailyQuestion.tsx" constants/index.ts
git commit -m "feat: add daily question history screen

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Cloud Functions (`SignificantOtherCF`)

**Files:**
- Modify: `C:/Users/gabri/OneDrive/projects/SignificantOtherCF/functions/src/index.ts`

**Interfaces:**
- Consumes the data model from Global Constraints. Names: `rooms/{roomId}/users/{uid}/name`. Tokens: `users/{uid}/fcmtokens` (passed to `sendEachForMulticast` as-is, like the existing functions). Each user's room: `users/{uid}/roomId`.
- Produces: exported functions `onDailyAnswerCreated` and `dailyQuestionReminder`.

Run every command in this task from `C:/Users/gabri/OneDrive/projects/SignificantOtherCF/functions`. Do not deploy.

- [ ] **Step 1: Imports and helpers**

At the top of `src/index.ts`, after the existing `firebase-functions/v2/database` import, add:
```ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
```
At the end of the file, add:
```ts
// ---------------------------------------------------------------------------
// Daily question
// ---------------------------------------------------------------------------

// The couple's day follows America/Costa_Rica: UTC−6 all year, no DST.
// Must match utils/dailyQuestion.ts in the app.
const COUPLE_UTC_OFFSET_MS = -6 * 60 * 60 * 1000;

const coupleDateKey = (now: number = Date.now()): string => {
  const date = new Date(now + COUPLE_UTC_OFFSET_MS);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

const sendToUser = async (userId: string, title: string, body: string) => {
  const userSnapshot = await db.ref(`users/${userId}`).once('value');
  const tokens = userSnapshot.val()?.fcmtokens;

  if (!tokens) {
    logger.debug(`No tokens for user ${userId}, skipping notification`);
    return;
  }

  const response = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    android: {
      notification: {
        defaultVibrateTimings: true,
        icon: 'notification_icon',
      },
    },
  });
  logger.debug(`Sent "${title}" to ${userId}: ${JSON.stringify(response)}`);
};
```

- [ ] **Step 2: `onDailyAnswerCreated`**

Append:
```ts
export const onDailyAnswerCreated = onValueCreated(
  {
    ref: 'rooms/{roomId}/dailyQuestions/{dateKey}/answers/{userId}',
  },
  async (event) => {
    const { roomId, dateKey, userId } = event.params;

    try {
      const usersSnapshot = await db.ref(`rooms/${roomId}/users`).once('value');
      const users = usersSnapshot.val();

      if (!users || typeof users !== 'object') {
        logger.warn(`Room ${roomId} has no users, skipping daily answer notification`);
        return;
      }

      const otherUserId = Object.keys(users).find((id) => id !== userId);
      if (!otherUserId) {
        logger.debug(`No partner in room ${roomId}, skipping daily answer notification`);
        return;
      }

      const name = users[userId]?.name;
      if (!name) {
        logger.warn(`Name missing for ${userId} in room ${roomId}, skipping notification`);
        return;
      }

      const otherAnswer = await db
        .ref(`rooms/${roomId}/dailyQuestions/${dateKey}/answers/${otherUserId}`)
        .once('value');

      if (otherAnswer.exists()) {
        await sendToUser(
          otherUserId,
          'You both answered 💬',
          `See what ${name} said about today's question.`,
        );
      } else {
        await sendToUser(
          otherUserId,
          `${name} answered today's question 👀`,
          'Answer yours to see what they said.',
        );
      }
    } catch (error) {
      logger.error(`Daily answer notification failed for room ${roomId}: ${error}`);
    }
  },
);
```

- [ ] **Step 3: `dailyQuestionReminder`**

Append:
```ts
export const dailyQuestionReminder = onSchedule(
  {
    schedule: '0 20 * * *',
    timeZone: 'America/Costa_Rica',
  },
  async () => {
    const today = coupleDateKey();

    // Read the small users node rather than every room (rooms hold
    // messages, whiteboards, etc.).
    const usersSnapshot = await db.ref('users').once('value');
    const users = usersSnapshot.val() || {};

    for (const [userId, user] of Object.entries<any>(users)) {
      const roomId = user?.roomId;
      if (!roomId || !user?.fcmtokens) continue;

      try {
        const answer = await db
          .ref(`rooms/${roomId}/dailyQuestions/${today}/answers/${userId}`)
          .once('value');
        if (answer.exists()) continue;

        await sendToUser(
          userId,
          "Today's question is waiting 💭",
          "Answer before midnight to see your partner's answer.",
        );
      } catch (error) {
        logger.error(`Daily question reminder failed for user ${userId}: ${error}`);
      }
    }
  },
);
```

- [ ] **Step 4: Build and lint**

Run: `npm run build` → expected to succeed with no errors.
Run: `npx eslint src/index.ts` → fix any errors in the code added by this task (match the file's existing style: single quotes, 2-space indent, trailing commas). Pre-existing lint issues elsewhere in the file are not this task's concern; note them in the report.

- [ ] **Step 5: Commit (in the SignificantOtherCF repo)**

```bash
git add functions/src/index.ts
git commit -m "feat: add daily question notifications and reminder

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
Do not commit `functions/lib/` (build output). Do not deploy.

---

### Task 6: Deploy and device verification (user)

**Files:** none.

- [ ] **Step 1:** Deploy the functions: `cd SignificantOtherCF/functions && npm run deploy`. The first deploy of a scheduled function may ask to enable Cloud Scheduler for the project.
- [ ] **Step 2:** Run the app on two phones (`npm run android`). Both Home screens show the same "Today's question".
- [ ] **Step 3:** Phone A answers. Phone B gets "{A} answered today's question 👀"; B's card shows only the question and **Answer**. A's card shows A's answer, "Waiting for {B}…" and **Edit**.
- [ ] **Step 4:** A edits the answer: no new notification to B.
- [ ] **Step 5:** B answers. A gets "You both answered 💬". Both cards show both answers and no **Edit** button.
- [ ] **Step 6:** Tap the card → "Daily questions" history with today at the top; the tab bar is hidden there.
- [ ] **Step 7:** The next evening, leave one phone unanswered: at 20:00 Costa Rica time it gets "Today's question is waiting 💭".
- [ ] **Step 8:** Set one phone to a different timezone: it still shows the same question as the other.
