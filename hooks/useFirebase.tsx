import { getApp, getApps, initializeApp } from 'firebase/app';
import { firebaseConfig } from '../config';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import {
  getStorage,
  uploadBytesResumable,
  getDownloadURL,
  ref as storageRef,
} from 'firebase/storage';
import { useAppToast } from './useAppToast';
import {
  getDatabase,
  ref as databaseRef,
  onValue,
  update,
  get,
  child,
  remove,
} from 'firebase/database';
import { PathData } from '../components';
import { useAuth } from './useAuth';
import uuid from 'react-native-uuid';
import { Activity, ActivityObject, Wishlist, Countdown, CountdownObject } from '../types';
import { Journal, JournalObject } from '../types/Journal';

export const useFirebase = () => {
  let app, auth;
  const { showToast } = useAppToast();
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage),
      });
    } catch (error) {
      showToast({
        title: 'Firebase',
        description: 'Firebase initialization failed',
        status: 'error',
      });
    }
  } else {
    app = getApp();
    auth = getAuth(app);
  }

  const db = getDatabase();

  const uploadToFirebaseStorage = async (
    uri: string,
    name?: string | null,
    onProgress?: (progress: string) => void,
  ): Promise<string | undefined> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const storage = getStorage();

    const FBref = storageRef(storage, `images/${name}`);

    const uploadTask = uploadBytesResumable(FBref, blob);

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
          const url = await getDownloadURL(uploadTask.snapshot.ref);

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
        paths: [],
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

  const updateWhiteboard = async (paths: PathData[], roomId: string, canvasColor: string) => {
    const whiteboardRef = databaseRef(db, `rooms/${roomId}/whiteboard`);

    await update(whiteboardRef, {
      paths,
      canvasColor,
    });
  };

  const updateWhiteBoardName = async (name: string, roomId: string) => {
    const whiteboardRef = databaseRef(db, `rooms/${roomId}/whiteboard`);

    await update(whiteboardRef, {
      name,
    });
  };

  const listenToWhiteboardEvents = (
    whiteBoardCallback: ({
      paths,
      canvasColor,
      name,
    }: {
      paths: PathData[];
      canvasColor: string;
      name: string;
    }) => void,
    roomId: string,
  ) => {
    const whiteboardRef = databaseRef(db, `rooms/${roomId}/whiteboard`);

    const unsubscribe = onValue(whiteboardRef, (snapshot) => {
      const data = snapshot.val();

      if (data) {
        whiteBoardCallback({
          paths: data.paths,
          canvasColor: data.canvasColor,
          name: data.name,
        });
      }
    });

    // Return the unsubscribe function
    return unsubscribe;
  };

  const getWhiteboard = async (roomId: string) => {
    const whiteboardRef = databaseRef(db, `rooms/${roomId}/whiteboard`);

    return get(whiteboardRef);
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

  const sendMessage = async ({
    roomId,
    uid,
    message,
    replyingTo,
  }: {
    roomId: string;
    uid: string;
    message: string;
    replyingTo?: {
      messageId: number;
      message: string;
      uid: string;
    };
  }) => {
    const roomRef = databaseRef(db, `rooms/${roomId}/messages`);
    const id = Date.now().toString();

    await update(roomRef, {
      [id]: {
        message,
        uid,
        timestamp: Date.now(),
        ...(replyingTo && { replyingTo }),
      },
    });
  };

  const listenToMessages = (
    messageCallback: (
      messages: {
        message: string;
        uid: string;
        timestamp: number;
      }[],
    ) => void,
    roomId: string,
  ) => {
    const roomRef = databaseRef(db, `rooms/${roomId}`);

    onValue(child(roomRef, 'messages'), (snapshot) => {
      const data = snapshot.val();

      if (data) {
        const messages = Object.keys(data).map((key) => data[key]);

        messageCallback(messages);
      }
    });
  };

  const getMessages = async (roomId: string) => {
    const roomRef = databaseRef(db, `rooms/${roomId}`);

    return get(child(roomRef, 'messages'));
  };

  const deleteMessage = async (roomId: string, messageId: number): Promise<void> => {
    const roomRef = databaseRef(db, `rooms/${roomId}/messages/${messageId}`);

    return remove(roomRef);
  };

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

  const getNumberOfItemsInJournal = async (uid: string) => {
    const roomRef = databaseRef(db, `rooms/${uid}/journal`);

    const snapshot = await get(roomRef);

    if (snapshot.exists()) {
      const data = snapshot.val();

      if (data) {
        return Object.keys(data).length;
      }
    }
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
      const data = snapshot.val();
      if (data) {
        countdownCallback({ countdowns: data });
      }
    });

    return unsubscribe;
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
    updateWhiteboard,
    getWhiteboard,
    createRoom,
    updateWhiteBoardName,
    sendMessage,
    listenToMessages,
    getMessages,
    deleteMessage,
    getFlower,
    updateFlower,
    listenToFlowerChanges,
    getFeeling,
    updateFeeling,
    listenToFeelingChanges,
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
    updateLocation,
    getLocation,
    listenToLocationChanges,
    getCountdowns,
    createCountdown,
    updateCountdown,
    deleteCountdown,
    listenToCountdownChanges,
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
