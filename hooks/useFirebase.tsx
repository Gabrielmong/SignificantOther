import { getIdToken } from '@react-native-firebase/auth';
import {
  getDatabase,
  ref as databaseRef,
  onValue,
  update,
  get,
  remove,
  push,
  query,
  orderByKey,
  orderByChild,
  limitToLast,
  startAt,
  endAt,
  onDisconnect,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  serverTimestamp,
  set,
  DataSnapshot,
  Query,
} from '@react-native-firebase/database';
import {
  getStorage,
  putFile,
  getDownloadURL,
  ref as storageRef,
} from '@react-native-firebase/storage';
import { useMemo } from 'react';
import { Dimensions } from 'react-native';
import uuid from 'react-native-uuid';

import { useAppToast } from './useAppToast';
import { firebaseConfig } from '../config';
import { ensureFirebaseApp } from '../services/firebaseApp';
import {
  Activity,
  Wishlist,
  Countdown,
  CountdownObject,
  FeelingHistoryEntry,
  FeelingHistoryMonth,
  DailyQuestionDay,
  Milestone,
  MilestoneObject,
  Photo,
  PhotoObject,
  Place,
  PlaceObject,
  MessageAttachment,
  MessageReply,
  MessageType,
  StoredStroke,
  Stroke,
  WhiteboardBoard,
} from '../types';
import { FavoriteThing, FavoriteThings } from '../types/FavoriteThing';
import { Journal, JournalObject } from '../types/Journal';
import { StoredWhiteboardSnapshot, WhiteboardSnapshot } from '../types/WhiteboardSnapshot';
import { todayKey } from '../utils/dailyQuestion';
import { monthKey } from '../utils/feelingHistory';
import { convertLegacyPaths, strokesFromStored, toStoredStroke } from '../utils/whiteboard';

type ShowToast = ReturnType<typeof useAppToast>['showToast'];

// Built once, so callers get stable functions they can list as effect
// dependencies without the effect re-running on every render
export const useFirebase = () => {
  const { showToast } = useAppToast();
  return useMemo(() => createFirebaseApi(showToast), [showToast]);
};

const createFirebaseApi = (showToast: ShowToast) => {
  let app, auth;
  try {
    ({ app, auth } = ensureFirebaseApp());
  } catch {
    showToast({
      title: 'Firebase',
      description: 'Firebase initialization failed',
      status: 'error',
    });
  }

  const db = getDatabase();

  const uploadToFirebaseStorage = async (
    uri: string,
    name?: string | null,
    onProgress?: (progress: string) => void,
  ): Promise<string | undefined> => {
    const FBref = storageRef(getStorage(), `images/${name}`);

    // Uploads natively, straight from the file on disk
    const uploadTask = putFile(FBref, uri);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress && onProgress(progress.toFixed(2));
        },
        (error) => {
          console.error(error);
          showToast({
            title: 'Image upload',
            description: 'Image upload failed',
            status: 'error',
          });

          reject(error);
        },
        async () => {
          const url = await getDownloadURL(FBref);

          if (url) {
            showToast({
              title: 'Image upload',
              description: 'Image uploaded successfully',
              status: 'success',
            });

            resolve(url);
          }
        },
      );
    });
  };

  const createRoom = async ({ uid }: { uid: string }) => {
    const roomId = uuid.v4().toString().substring(0, 15);

    const roomRef = databaseRef(db, `rooms/${roomId}`);

    await update(roomRef, {
      id: roomId,
      messages: [],
      users: {
        [uid]: {
          selectedFlower: 'rose',
          message: '',
          selectedFeeling: 'neutral',
        },
      },
      whiteboard: {
        name: `Shared Board`,
        canvasColor: '#ffffff',
      },
      wishlist: {
        activities: [],
        movies: [],
        music: [],
        books: [],
        food: [],
        dates: [],
      },
    });

    return roomId;
  };

  // Whiteboard: one entry per stroke under `strokes`, in board units (see
  // types/Whiteboard). Boards from before v2 keep screen-pixel `paths`, which
  // are converted the first time they're read.
  const whiteboardRef = (roomId: string) => databaseRef(db, `rooms/${roomId}/whiteboard`);

  // Old boards were drawn on the whiteboard screen's canvas: the window width
  // minus the screen's 20px padding on each side
  const legacyCanvasWidth = () => Dimensions.get('window').width - 40;

  // Converts a pre-v2 board in place. Its `paths` are left as they are, so
  // older app versions keep working until both phones update.
  const toBoard = (roomId: string, data: any): WhiteboardBoard => {
    let stored = data?.strokes;
    if (data?.paths && !data.migratedAt) {
      const converted = convertLegacyPaths(data.paths, legacyCanvasWidth());
      stored = { ...converted, ...stored };
      update(whiteboardRef(roomId), {
        ...Object.fromEntries(
          Object.entries(converted).map(([id, stroke]) => [`strokes/${id}`, stroke]),
        ),
        migratedAt: serverTimestamp(),
      }).catch((error) => console.error('Error converting whiteboard:', error));
    }

    return {
      strokes: strokesFromStored(stored),
      canvasColor: data?.canvasColor || 'white',
      name: data?.name || '',
    };
  };

  /** Saves a finished stroke and returns its id; listeners get it right away */
  const addStroke = (roomId: string, stroke: Omit<Stroke, 'id'>) => {
    const strokeRef = push(databaseRef(db, `rooms/${roomId}/whiteboard/strokes`));
    set(strokeRef, toStoredStroke(stroke)).catch((error) =>
      console.error('Error saving stroke:', error),
    );
    return strokeRef.key as string;
  };

  const removeStrokes = async (roomId: string, ids: string[]) => {
    if (ids.length === 0) return;
    await update(
      whiteboardRef(roomId),
      Object.fromEntries(ids.map((id) => [`strokes/${id}`, null])),
    );
  };

  // Puts strokes back under their own ids, e.g. when undoing a clear
  const restoreStrokes = async (roomId: string, strokes: Stroke[]) => {
    if (strokes.length === 0) return;
    await update(
      whiteboardRef(roomId),
      Object.fromEntries(
        strokes.map(({ id, ...stroke }) => [`strokes/${id}`, toStoredStroke(stroke)]),
      ),
    );
  };

  const updateCanvasColor = async (roomId: string, canvasColor: string) => {
    await update(whiteboardRef(roomId), { canvasColor });
  };

  const updateWhiteBoardName = async (name: string, roomId: string) => {
    const whiteboardRef = databaseRef(db, `rooms/${roomId}/whiteboard`);

    await update(whiteboardRef, {
      name,
    });
  };

  // Reports an empty board too, so a room without one still finishes loading
  const listenToWhiteboardEvents = (
    whiteBoardCallback: (board: WhiteboardBoard) => void,
    roomId: string,
  ) =>
    onValue(whiteboardRef(roomId), (snapshot) => {
      whiteBoardCallback(toBoard(roomId, snapshot.val()));
    });

  const getWhiteboard = async (roomId: string) => {
    const snapshot = await get(whiteboardRef(roomId));
    return toBoard(roomId, snapshot.val());
  };

  const saveWhiteboardSnapshot = async (
    roomId: string,
    { strokes, ...snapshot }: WhiteboardSnapshot,
  ) => {
    const snapshotsRef = databaseRef(db, `rooms/${roomId}/whiteboardSnapshots`);
    await push(snapshotsRef, {
      ...snapshot,
      strokes: strokes.map(({ id: _id, ...stroke }) => toStoredStroke(stroke)),
    });
  };

  // Snapshots saved before v2 are converted, and the converted strokes are
  // stored beside their old `paths`
  const getWhiteboardSnapshots = async (roomId: string): Promise<WhiteboardSnapshot[]> => {
    const snapshotsRef = databaseRef(db, `rooms/${roomId}/whiteboardSnapshots`);
    const snapshot = await get(snapshotsRef);
    if (!snapshot.exists()) return [];
    const data = snapshot.val() as Record<string, StoredWhiteboardSnapshot>;

    const conversions: Record<string, StoredStroke[]> = {};
    const snapshots = Object.entries(data).map(([key, { strokes, paths, ...rest }]) => {
      let stored = strokes;
      if (!stored && paths) {
        stored = Object.values(convertLegacyPaths(paths, legacyCanvasWidth()));
        conversions[`${key}/strokes`] = stored;
      }
      return { ...rest, strokes: strokesFromStored(stored) };
    });

    if (Object.keys(conversions).length > 0) {
      update(snapshotsRef, conversions).catch((error) =>
        console.error('Error converting whiteboard snapshots:', error),
      );
    }

    return snapshots.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  };

  const joinRoom = async (roomId: string, userId: string) => {
    const whiteboardRef = databaseRef(db, `rooms/${roomId}/whiteboard`);
    const userRef = databaseRef(db, `rooms/${roomId}/users/${userId}`);

    await update(userRef, {
      selectedFlower: 'rose',
      selectedFeeling: 'neutral',
      message: '',
    });

    get(whiteboardRef).then((snapshot) => {
      const data = snapshot.val();

      if (data) {
        return data;
      }
    });
  };

  // Chat
  // Messages are ordered by their `timestamp` child, never their key: newer
  // messages use push() keys and older ones are keyed by timestamp, and the two
  // key styles don't sort together. Needs ".indexOn": ["timestamp"] on
  // rooms/$roomId/messages in the database rules, or Firebase downloads the
  // whole chat and filters on the phone.
  const messagesRef = (roomId: string) => databaseRef(db, `rooms/${roomId}/messages`);

  const toMessage = (snapshot: DataSnapshot): MessageType => ({
    id: snapshot.key as string,
    ...snapshot.val(),
  });

  // One read of a query. Unlike get(), which the server rejects for a query
  // with no index ("Index not defined"), a one-off listener falls back to
  // filtering on the phone, so chat keeps working before the index is added.
  const readOnce = (q: Query) =>
    new Promise<DataSnapshot>((resolve, reject) => {
      onValue(q, resolve, reject, { onlyOnce: true });
    });

  // forEach walks the children in query order (oldest first)
  const toMessages = (snapshot: DataSnapshot) => {
    const messages: MessageType[] = [];
    snapshot.forEach((child) => {
      messages.push(toMessage(child));
      return undefined;
    });
    return messages;
  };

  // The key exists the moment push() runs, so the message can show right away;
  // `delivered` settles once the server has it (it stays pending while offline)
  const sendMessage = ({
    roomId,
    uid,
    message,
    replyingTo,
    attachment,
  }: {
    roomId: string;
    uid: string;
    message: string;
    replyingTo?: MessageReply;
    attachment?: MessageAttachment;
  }) => {
    const messageRef = push(messagesRef(roomId));
    const delivered = set(messageRef, {
      message,
      uid,
      timestamp: serverTimestamp(),
      ...(replyingTo && { replyingTo }),
      ...(attachment && { attachment }),
    });

    return { id: messageRef.key as string, delivered };
  };

  const getLatestMessages = async (roomId: string, limit: number) => {
    const snapshot = await readOnce(
      query(messagesRef(roomId), orderByChild('timestamp'), limitToLast(limit)),
    );
    return toMessages(snapshot);
  };

  // The page just before `oldest`; the key breaks ties between equal timestamps.
  // React Native Firebase doesn't implement endBefore(), so this ends at
  // `oldest` itself with one extra slot and drops it here.
  const getMessagesBefore = async (roomId: string, oldest: MessageType, limit: number) => {
    const snapshot = await readOnce(
      query(
        messagesRef(roomId),
        orderByChild('timestamp'),
        endAt(oldest.timestamp, oldest.id),
        limitToLast(limit + 1),
      ),
    );
    return toMessages(snapshot)
      .filter((message) => message.id !== oldest.id)
      .slice(-limit);
  };

  // Live adds, edits and deletes for every message from `fromTimestamp` on: the
  // loaded window plus anything new. No limit, so a new message never pushes an
  // old one out of the query (which would look like a delete).
  const listenToMessageChanges = (
    roomId: string,
    fromTimestamp: number | null,
    handlers: {
      onAdded: (message: MessageType) => void;
      onChanged: (message: MessageType) => void;
      onRemoved: (id: string) => void;
    },
  ) => {
    const live =
      fromTimestamp === null
        ? query(messagesRef(roomId), orderByChild('timestamp'))
        : query(messagesRef(roomId), orderByChild('timestamp'), startAt(fromTimestamp));

    const unsubscribes = [
      onChildAdded(live, (snapshot) => handlers.onAdded(toMessage(snapshot))),
      onChildChanged(live, (snapshot) => handlers.onChanged(toMessage(snapshot))),
      onChildRemoved(live, (snapshot) => handlers.onRemoved(snapshot.key as string)),
    ];

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  };

  const deleteMessage = async (roomId: string, messageId: string): Promise<void> => {
    return remove(databaseRef(db, `rooms/${roomId}/messages/${messageId}`));
  };

  // Reactions live on the message (reactions/{uid}: emoji), so they arrive
  // through the same live child-changed events as edits; null removes yours
  const setMessageReaction = async (
    roomId: string,
    messageId: string,
    uid: string,
    emoji: string | null,
  ) => {
    const reactionRef = databaseRef(db, `rooms/${roomId}/messages/${messageId}/reactions/${uid}`);
    await (emoji ? set(reactionRef, emoji) : remove(reactionRef));
  };

  // Server time of when each partner last had the chat open
  const markChatRead = async (roomId: string, uid: string) => {
    await set(databaseRef(db, `rooms/${roomId}/chatReads/${uid}`), serverTimestamp());
  };

  const listenToChatReads = (roomId: string, callback: (reads: Record<string, number>) => void) =>
    onValue(databaseRef(db, `rooms/${roomId}/chatReads`), (s) => callback(s.val() || {}));

  // Partner messages newer than your last read. Re-queries whenever your read
  // marker moves, and never-read counts as nothing unread rather than the
  // whole history.
  const listenToUnreadCount = (roomId: string, uid: string, callback: (count: number) => void) => {
    let unsubscribeMessages = () => {};

    const unsubscribeRead = onValue(
      databaseRef(db, `rooms/${roomId}/chatReads/${uid}`),
      (readSnapshot) => {
        unsubscribeMessages();
        const lastRead = readSnapshot.val();
        if (typeof lastRead !== 'number') {
          unsubscribeMessages = () => {};
          callback(0);
          return;
        }

        // startAt() is inclusive (React Native Firebase doesn't implement
        // startAfter()), so a message sent exactly at lastRead is skipped here
        unsubscribeMessages = onValue(
          query(messagesRef(roomId), orderByChild('timestamp'), startAt(lastRead)),
          (snapshot) => {
            let count = 0;
            snapshot.forEach((child) => {
              const message = child.val();
              if (message?.uid !== uid && message?.timestamp > lastRead) count += 1;
              return undefined;
            });
            callback(count);
          },
        );
      },
    );

    return () => {
      unsubscribeRead();
      unsubscribeMessages();
    };
  };

  // typing/{uid} holds when you last typed; it's removed when you stop, and
  // by the server if the app drops offline mid-sentence
  const setTyping = async (roomId: string, uid: string, typing: boolean) => {
    const typingRef = databaseRef(db, `rooms/${roomId}/typing/${uid}`);
    if (typing) {
      await set(typingRef, serverTimestamp());
      await onDisconnect(typingRef).remove();
    } else {
      await remove(typingRef);
    }
  };

  const listenToTyping = (roomId: string, callback: (typing: Record<string, number>) => void) =>
    onValue(databaseRef(db, `rooms/${roomId}/typing`), (s) => callback(s.val() || {}));

  const getFlower = async (roomId: string, uid: string) => {
    const roomRef = databaseRef(db, `rooms/${roomId}/users/${uid}`);

    return get(roomRef);
  };

  const updateFlower = async (roomId: string, uid: string, flower: string, message: string) => {
    const roomRef = databaseRef(db, `rooms/${roomId}/users/${uid}`);

    await update(roomRef, {
      selectedFlower: flower,
      message,
    });
  };

  const listenToFlowerChanges = (
    flowerCallback: ({ flower, message }: { flower: string; message: string }) => void,
    roomId: string,
    uid: string,
  ) => {
    const roomRef = databaseRef(db, `rooms/${roomId}/users/${uid}`);

    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();

      if (data) {
        flowerCallback({
          flower: data.selectedFlower,
          message: data.message,
        });
      }
    });

    return unsubscribe;
  };

  const getFeeling = async (roomId: string, uid: string) => {
    const roomRef = databaseRef(db, `rooms/${roomId}/users/${uid}`);

    return get(roomRef);
  };

  const updateFeeling = async (roomId: string, uid: string, feeling: string) => {
    const roomRef = databaseRef(db, `rooms/${roomId}/users/${uid}`);

    await update(roomRef, {
      selectedFeeling: feeling,
    });
  };

  const logFeelingHistory = async (
    roomId: string,
    uid: string,
    feeling: string,
    at: number = Date.now(),
  ) => {
    const monthRef = databaseRef(db, `rooms/${roomId}/feelingHistory/${uid}/${monthKey(at)}`);

    await push(monthRef, { feeling, at });
  };

  const getFeelingHistoryMonth = async (
    roomId: string,
    uid: string,
    month: string,
  ): Promise<FeelingHistoryEntry[]> => {
    const monthRef = databaseRef(db, `rooms/${roomId}/feelingHistory/${uid}/${month}`);
    const snapshot = await get(monthRef);
    const data = (snapshot.val() || {}) as FeelingHistoryMonth;

    // Skip malformed rows rather than letting them break grouping.
    return Object.values(data)
      .filter(
        (entry) => !!entry && typeof entry.feeling === 'string' && typeof entry.at === 'number',
      )
      .sort((a, b) => a.at - b.at);
  };

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
    // partner notification Cloud Function. An answer for a day that has ended
    // is kept but marked late.
    const late = dateKey < todayKey();
    await update(dayRef, {
      question,
      [`answers/${uid}`]: { text, answeredAt: Date.now(), ...(late && { late: true }) },
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

  const listenToFeelingChanges = (
    feelingCallback: ({ feeling }: { feeling: string }) => void,
    roomId: string,
    uid: string,
  ) => {
    const roomRef = databaseRef(db, `rooms/${roomId}/users/${uid}`);

    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();

      if (data) {
        feelingCallback({
          feeling: data.selectedFeeling,
        });
      }
    });

    return unsubscribe;
  };

  // Whishlist

  const getWishlist = async (uid: string) => {
    const roomRef = databaseRef(db, `rooms/${uid}/wishlist`);

    const snapshot = await get(roomRef);

    if (snapshot.exists()) {
      const data = snapshot.val();

      if (data) {
        return data;
      }
    }
  };

  const createEntryInWishlist = async (uid: string, wishListEntry: Activity, under: string) => {
    const roomRef = databaseRef(db, `rooms/${uid}/wishlist/${under}`);
    const id = uuid.v4().toString().substring(0, 12);

    await update(roomRef, {
      [id]: wishListEntry,
    });
  };

  const updateEntryInWishlist = async (
    uid: string,
    entryId: string,
    wishListEntry: Activity,
    under: string,
  ) => {
    const roomRef = databaseRef(db, `rooms/${uid}/wishlist/${under}/${entryId}`);

    await update(roomRef, wishListEntry);
  };

  const listenToWishlistChanges = (
    wishlistCallback: ({ wishlist }: { wishlist: Wishlist }) => void,
    uid: string,
  ) => {
    const roomRef = databaseRef(db, `rooms/${uid}/wishlist`);

    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();

      if (data) {
        wishlistCallback({
          wishlist: data,
        });
      }
    });

    return unsubscribe;
  };

  const deleteWishlistEntry = async (
    uid: string,
    entryId: string,
    under: string,
  ): Promise<void> => {
    const roomRef = databaseRef(db, `rooms/${uid}/wishlist/${under}/${entryId}`);

    return remove(roomRef);
  };

  const getNumberOfItemsInWishlist = async (uid: string) => {
    const roomRef = databaseRef(db, `rooms/${uid}/wishlist`);

    const snapshot = await get(roomRef);

    if (snapshot.exists()) {
      const data = snapshot.val();

      if (data) {
        let count = 0;

        Object.keys(data).forEach((key) => {
          count += Object.keys(data[key]).length;
        });

        return count;
      }
    }
  };

  const listentoNumberOfItemsInWishlist = (
    countCallback: ({ count }: { count: number }) => void,
    uid: string,
  ) => {
    const roomRef = databaseRef(db, `rooms/${uid}/wishlist`);

    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();

      if (data) {
        let count = 0;

        Object.keys(data).forEach((key) => {
          count += Object.keys(data[key]).length;
        });

        countCallback({
          count,
        });
      }
    });

    return unsubscribe;
  };

  const getJournal = async (uid: string) => {
    const roomRef = databaseRef(db, `rooms/${uid}/journal`);

    const snapshot = await get(roomRef);

    if (snapshot.exists()) {
      const data = snapshot.val();

      if (data) {
        return data;
      }
    }
  };

  const getEntryInJournal = async (uid: string, entryId: string) => {
    const roomRef = databaseRef(db, `rooms/${uid}/journal/${entryId}`);

    const snapshot = await get(roomRef);

    if (snapshot.exists()) {
      const data = snapshot.val();

      if (data) {
        return data;
      }
    }
  };

  const createEntryInJournal = async (uid: string, entry: Journal) => {
    const roomRef = databaseRef(db, `rooms/${uid}/journal`);
    const id = uuid.v4().toString().substring(0, 12);

    await update(roomRef, {
      [id]: entry,
    });
  };

  const updateEntryInJournal = async (uid: string, entryId: string, entry: Journal) => {
    const roomRef = databaseRef(db, `rooms/${uid}/journal/${entryId}`);

    await update(roomRef, entry);
  };

  const deleteEntryInJournal = async (uid: string, entryId: string) => {
    const roomRef = databaseRef(db, `rooms/${uid}/journal/${entryId}`);

    return remove(roomRef);
  };

  const markJournalEntryAsRead = async (roomId: string, entryId: string) => {
    const entryRef = databaseRef(db, `rooms/${roomId}/journal/${entryId}`);
    await update(entryRef, { readAt: new Date().toISOString() });
  };

  const listenToJournalChanges = (
    journalCallback: ({ journal }: { journal: JournalObject }) => void,
    uid: string,
  ) => {
    const roomRef = databaseRef(db, `rooms/${uid}/journal`);

    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();

      if (data) {
        journalCallback({
          journal: data,
        });
      }
    });

    return unsubscribe;
  };

  // Counts with the REST API's shallow read, which returns only the keys:
  // journal entries can be long, and Home only shows how many there are
  const getNumberOfItemsInJournal = async (uid: string) => {
    const user = ensureFirebaseApp().auth.currentUser;
    const token = user ? await getIdToken(user) : undefined;
    const response = await fetch(
      `${firebaseConfig.databaseURL}rooms/${uid}/journal.json?shallow=true&auth=${token}`,
    );
    if (!response.ok) throw new Error(`Journal count failed: ${response.status}`);
    const keys = await response.json();
    return keys ? Object.keys(keys).length : 0;
  };

  // Favorites
  // Scoped under the author's own uid so each partner's list is only ever
  // read/written by themselves, keeping entries private from the partner.

  const getFavoriteThings = async (roomId: string, authorUid: string) => {
    const favoriteThingsRef = databaseRef(db, `rooms/${roomId}/favoriteThings/${authorUid}`);

    const snapshot = await get(favoriteThingsRef);

    if (snapshot.exists()) {
      const data = snapshot.val();

      if (data) {
        return data;
      }
    }
  };

  const createFavoriteThing = async (
    roomId: string,
    authorUid: string,
    favoriteThing: FavoriteThing,
    under: string,
  ) => {
    const favoriteThingsRef = databaseRef(
      db,
      `rooms/${roomId}/favoriteThings/${authorUid}/${under}`,
    );
    const id = uuid.v4().toString().substring(0, 12);

    await update(favoriteThingsRef, {
      [id]: favoriteThing,
    });
  };

  const updateFavoriteThing = async (
    roomId: string,
    authorUid: string,
    entryId: string,
    favoriteThing: FavoriteThing,
    under: string,
  ) => {
    const favoriteThingRef = databaseRef(
      db,
      `rooms/${roomId}/favoriteThings/${authorUid}/${under}/${entryId}`,
    );

    await update(favoriteThingRef, favoriteThing);
  };

  const deleteFavoriteThing = async (
    roomId: string,
    authorUid: string,
    entryId: string,
    under: string,
  ): Promise<void> => {
    const favoriteThingRef = databaseRef(
      db,
      `rooms/${roomId}/favoriteThings/${authorUid}/${under}/${entryId}`,
    );

    return remove(favoriteThingRef);
  };

  const listenToFavoriteThingsChanges = (
    favoriteThingsCallback: ({ favoriteThings }: { favoriteThings: FavoriteThings }) => void,
    roomId: string,
    authorUid: string,
  ) => {
    const favoriteThingsRef = databaseRef(db, `rooms/${roomId}/favoriteThings/${authorUid}`);

    const unsubscribe = onValue(favoriteThingsRef, (snapshot) => {
      const data = snapshot.val();

      if (data) {
        favoriteThingsCallback({
          favoriteThings: data,
        });
      }
    });

    return unsubscribe;
  };

  const getNumberOfFavoriteThings = async (roomId: string, authorUid: string) => {
    const favoriteThingsRef = databaseRef(db, `rooms/${roomId}/favoriteThings/${authorUid}`);

    const snapshot = await get(favoriteThingsRef);

    if (snapshot.exists()) {
      const data = snapshot.val();

      if (data) {
        let count = 0;

        Object.keys(data).forEach((key) => {
          count += Object.keys(data[key]).length;
        });

        return count;
      }
    }

    return 0;
  };

  // Location
  const updateLocation = async (
    roomId: string,
    uid: string,
    location: { latitude: number; longitude: number; timestamp: number },
  ) => {
    const locationRef = databaseRef(db, `rooms/${roomId}/users/${uid}/location`);

    await update(locationRef, {
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: location.timestamp,
    });
  };

  const getLocation = async (roomId: string, uid: string) => {
    const locationRef = databaseRef(db, `rooms/${roomId}/users/${uid}/location`);

    const snapshot = await get(locationRef);

    if (snapshot.exists()) {
      return snapshot.val();
    }

    return null;
  };

  const listenToLocationChanges = (
    locationCallback: (
      location: {
        latitude: number;
        longitude: number;
        timestamp: number;
      } | null,
    ) => void,
    roomId: string,
    uid: string,
  ) => {
    const locationRef = databaseRef(db, `rooms/${roomId}/users/${uid}/location`);

    const unsubscribe = onValue(locationRef, (snapshot) => {
      const data = snapshot.val();

      if (data) {
        locationCallback({
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: data.timestamp,
        });
      } else {
        locationCallback(null);
      }
    });

    return unsubscribe;
  };

  // Countdown Management
  const getCountdowns = async (uid: string) => {
    const roomRef = databaseRef(db, `rooms/${uid}/countdowns`);
    const snapshot = await get(roomRef);

    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  };

  const createCountdown = async (uid: string, countdown: Countdown) => {
    const roomRef = databaseRef(db, `rooms/${uid}/countdowns`);
    const id = uuid.v4().toString().substring(0, 12);

    await update(roomRef, {
      [id]: { ...countdown, id },
    });

    return id;
  };

  const updateCountdown = async (uid: string, countdownId: string, countdown: Countdown) => {
    const roomRef = databaseRef(db, `rooms/${uid}/countdowns/${countdownId}`);
    await update(roomRef, countdown);
  };

  const deleteCountdown = async (uid: string, countdownId: string) => {
    const roomRef = databaseRef(db, `rooms/${uid}/countdowns/${countdownId}`);
    return remove(roomRef);
  };

  const listenToCountdownChanges = (
    countdownCallback: ({ countdowns }: { countdowns: CountdownObject }) => void,
    uid: string,
  ) => {
    const roomRef = databaseRef(db, `rooms/${uid}/countdowns`);

    const unsubscribe = onValue(roomRef, (snapshot) => {
      // Report an empty list too, so deleting the last countdown clears it.
      countdownCallback({ countdowns: snapshot.val() || {} });
    });

    return unsubscribe;
  };

  // Writes a countdown under a known id (used for milestone anniversaries,
  // whose id is derived from the milestone so it can't be duplicated)
  const setCountdown = async (roomId: string, countdown: Countdown & { id: string }) => {
    await set(databaseRef(db, `rooms/${roomId}/countdowns/${countdown.id}`), countdown);
  };

  // Milestone Management
  const newId = () => uuid.v4().toString().substring(0, 12);

  // Whether this device is connected to the Realtime Database right now
  const isConnected = () =>
    new Promise<boolean>((resolve) => {
      onValue(databaseRef(db, '.info/connected'), (snapshot) => resolve(snapshot.val() === true), {
        onlyOnce: true,
      });
    });

  const setMilestone = async (roomId: string, milestone: Milestone) => {
    await set(databaseRef(db, `rooms/${roomId}/milestones/${milestone.id}`), milestone);
  };

  const deleteMilestone = async (roomId: string, id: string) => {
    await remove(databaseRef(db, `rooms/${roomId}/milestones/${id}`));
  };

  const listenToMilestoneChanges = (
    milestoneCallback: (milestones: MilestoneObject) => void,
    roomId: string,
  ) => {
    // Report an empty list too, so deleting the last milestone clears it.
    return onValue(databaseRef(db, `rooms/${roomId}/milestones`), (snapshot) => {
      milestoneCallback(snapshot.val() || {});
    });
  };

  // Gallery Photos
  const listenToPhotoChanges = (photoCallback: (photos: PhotoObject) => void, roomId: string) => {
    // Report an empty list too, so deleting the last photo clears it.
    return onValue(databaseRef(db, `rooms/${roomId}/photos`), (snapshot) => {
      photoCallback(snapshot.val() || {});
    });
  };

  const setPhoto = async (roomId: string, photo: Photo) => {
    await set(databaseRef(db, `rooms/${roomId}/photos/${photo.id}`), photo);
  };

  // Merges fields into a photo (null deletes a field)
  const updatePhoto = async (roomId: string, id: string, fields: Record<string, unknown>) => {
    await update(databaseRef(db, `rooms/${roomId}/photos/${id}`), fields);
  };

  const deletePhotoRecord = async (roomId: string, id: string) => {
    await remove(databaseRef(db, `rooms/${roomId}/photos/${id}`));
  };

  // Places
  const listenToPlaceChanges = (placeCallback: (places: PlaceObject) => void, roomId: string) => {
    // Report an empty list too, so deleting the last place clears it.
    return onValue(databaseRef(db, `rooms/${roomId}/places`), (snapshot) => {
      placeCallback(snapshot.val() || {});
    });
  };

  const setPlace = async (roomId: string, place: Place) => {
    await set(databaseRef(db, `rooms/${roomId}/places/${place.id}`), place);
  };

  const deletePlaceRecord = async (roomId: string, id: string) => {
    await remove(databaseRef(db, `rooms/${roomId}/places/${id}`));
  };

  // Writes several paths at once (all or nothing)
  const applyUpdates = async (updates: Record<string, unknown>) => {
    await update(databaseRef(db), updates);
  };

  const getPhoto = async (roomId: string, id: string): Promise<Photo | null> => {
    const snapshot = await get(databaseRef(db, `rooms/${roomId}/photos/${id}`));
    return snapshot.exists() ? snapshot.val() : null;
  };

  // Zone Management Functions
  const getZones = async (uid: string) => {
    const roomRef = databaseRef(db, `rooms/${uid}/zones`);
    const snapshot = await get(roomRef);
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  };

  const createZone = async (uid: string, zone: any) => {
    const roomRef = databaseRef(db, `rooms/${uid}/zones`);
    const id = uuid.v4().toString().substring(0, 12);
    await update(roomRef, {
      [id]: {
        ...zone,
        id,
      },
    });
    return id;
  };

  const updateZone = async (uid: string, zoneId: string, zone: any) => {
    const roomRef = databaseRef(db, `rooms/${uid}/zones/${zoneId}`);
    await update(roomRef, zone);
  };

  const deleteZone = async (uid: string, zoneId: string) => {
    const roomRef = databaseRef(db, `rooms/${uid}/zones/${zoneId}`);
    return remove(roomRef);
  };

  const listenToZoneChanges = (zoneCallback: ({ zones }: { zones: any }) => void, uid: string) => {
    const roomRef = databaseRef(db, `rooms/${uid}/zones`);

    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        zoneCallback({ zones: data });
      }
    });

    return unsubscribe;
  };

  // Zone Status Functions
  const updateZoneStatus = async (uid: string, userId: string, zoneId: string, status: any) => {
    const statusRef = databaseRef(db, `rooms/${uid}/zoneStatus/${userId}/${zoneId}`);
    await update(statusRef, status);
  };

  const getZoneStatus = async (uid: string, userId: string) => {
    const statusRef = databaseRef(db, `rooms/${uid}/zoneStatus/${userId}`);
    const snapshot = await get(statusRef);
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  };

  const listenToZoneStatusChanges = (
    statusCallback: (status: any) => void,
    uid: string,
    userId: string,
  ) => {
    const statusRef = databaseRef(db, `rooms/${uid}/zoneStatus/${userId}`);

    const unsubscribe = onValue(statusRef, (snapshot) => {
      const data = snapshot.val();
      statusCallback(data || {});
    });

    return unsubscribe;
  };

  const getUserProfile = async (uid: string) => {
    const userRef = databaseRef(db, `users/${uid}`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
      return snapshot.val();
    }

    return null;
  };

  return {
    app,
    auth,
    uploadToFirebaseStorage,
    listenToWhiteboardEvents,
    joinRoom,
    addStroke,
    removeStrokes,
    restoreStrokes,
    updateCanvasColor,
    getWhiteboard,
    saveWhiteboardSnapshot,
    getWhiteboardSnapshots,
    createRoom,
    updateWhiteBoardName,
    sendMessage,
    getLatestMessages,
    getMessagesBefore,
    listenToMessageChanges,
    deleteMessage,
    setMessageReaction,
    markChatRead,
    listenToChatReads,
    listenToUnreadCount,
    setTyping,
    listenToTyping,
    getFlower,
    updateFlower,
    listenToFlowerChanges,
    getFeeling,
    updateFeeling,
    listenToFeelingChanges,
    logFeelingHistory,
    getFeelingHistoryMonth,
    saveDailyAnswer,
    editDailyAnswer,
    listenToDailyQuestionDay,
    getDailyQuestionHistory,
    getWishlist,
    updateEntryInWishlist,
    listenToWishlistChanges,
    deleteWishlistEntry,
    getNumberOfItemsInWishlist,
    createEntryInWishlist,
    listentoNumberOfItemsInWishlist,
    getJournal,
    createEntryInJournal,
    updateEntryInJournal,
    deleteEntryInJournal,
    markJournalEntryAsRead,
    listenToJournalChanges,
    getEntryInJournal,
    getNumberOfItemsInJournal,
    getFavoriteThings,
    createFavoriteThing,
    updateFavoriteThing,
    deleteFavoriteThing,
    listenToFavoriteThingsChanges,
    getNumberOfFavoriteThings,
    updateLocation,
    getLocation,
    listenToLocationChanges,
    getCountdowns,
    createCountdown,
    updateCountdown,
    deleteCountdown,
    listenToCountdownChanges,
    setCountdown,
    newId,
    isConnected,
    setMilestone,
    deleteMilestone,
    listenToMilestoneChanges,
    listenToPhotoChanges,
    setPhoto,
    updatePhoto,
    deletePhotoRecord,
    getPhoto,
    listenToPlaceChanges,
    setPlace,
    deletePlaceRecord,
    applyUpdates,
    getZones,
    createZone,
    updateZone,
    deleteZone,
    listenToZoneChanges,
    updateZoneStatus,
    getZoneStatus,
    listenToZoneStatusChanges,
    getUserProfile,
  };
};
