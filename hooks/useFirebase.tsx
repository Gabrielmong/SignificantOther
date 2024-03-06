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
import { getDatabase, ref as databaseRef, onValue, update, get, child } from 'firebase/database';
import { PathData } from '../components';
import { useAuth } from './useAuth';
import uuid from 'react-native-uuid';

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
      users: [uid],
      whiteboard: {
        name: `Shared Board`,
        canvasColor: '#ffffff',
        paths: [],
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

    onValue(whiteboardRef, (snapshot) => {
      const data = snapshot.val();

      if (data) {
        whiteBoardCallback({
          paths: data.paths,
          canvasColor: data.canvasColor,
          name: data.name,
        });
      }
    });
  };

  const getWhiteboard = async (roomId: string) => {
    const whiteboardRef = databaseRef(db, `rooms/${roomId}/whiteboard`);

    return get(whiteboardRef);
  };

  const joinWhiteboard = async (roomId: string) => {
    const whiteboardRef = databaseRef(db, `rooms/${roomId}/whiteboard`);

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
  }: {
    roomId: string;
    uid: string;
    message: string;
  }) => {
    const roomRef = databaseRef(db, `rooms/${roomId}/messages`);
    const id = Date.now().toString();

    await update(roomRef, {
      [id]: {
        message,
        uid,
        timestamp: Date.now(),
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

  return {
    app,
    auth,
    uploadToFirebaseStorage,
    listenToWhiteboardEvents,
    joinWhiteboard,
    updateWhiteboard,
    getWhiteboard,
    createRoom,
    updateWhiteBoardName,
    sendMessage,
    listenToMessages,
    getMessages,
  };
};
