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

  const createWhiteboard = async () => {
    const whiteboardId = uuid.v4().toString();

    const whiteboardRef = databaseRef(db, `whiteboard/${whiteboardId}`);

    const newWhiteboard = {
      id: whiteboardId,
      name: `Whiteboard ${whiteboardId}`,
      canvasColor: '#ffffff',
      paths: [],
    };

    await update(whiteboardRef, newWhiteboard);

    return whiteboardId;
  };

  const updateWhiteboard = async (paths: PathData[], whiteboardId: string, canvasColor: string) => {
    const whiteboardRef = databaseRef(db, `whiteboard/${whiteboardId}`);

    await update(whiteboardRef, {
      paths,
      canvasColor,
    });
  };

  const listenToWhiteboardEvents = (
    whiteBoardCallback: ({
      paths,
      canvasColor,
    }: {
      paths: PathData[];
      canvasColor: string;
    }) => void,
    whiteboardId: string,
  ) => {
    const whiteboardRef = databaseRef(db, `whiteboard/${whiteboardId}`);

    onValue(whiteboardRef, (snapshot) => {
      const data = snapshot.val();

      if (data) {
        whiteBoardCallback({
          paths: data.paths,
          canvasColor: data.canvasColor,
        });
      }
    });
  };

  const getWhiteboard = async (
    whiteboardId: string,
  ): Promise<{
    id: string;
    name: string;
    canvasColor: string;
    paths: PathData[];
  }> => {
    new Promise((resolve, reject) => {
      const whiteboardRef = databaseRef(db, `whiteboard/${whiteboardId}`);

      get(whiteboardRef)
        .then((snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();

            if (data) {
              resolve(data);
            }
          } else {
            console.log('No data available');
          }
        })
        .catch((error) => {
          console.error(error);
        });
    });

    return {
      id: '',
      name: '',
      canvasColor: '',
      paths: [],
    };
  };

  const joinWhiteboard = async (whiteboardId: string) => {
    const whiteboardRef = databaseRef(db, `whiteboard/${whiteboardId}`);

    get(whiteboardRef).then((snapshot) => {
      const data = snapshot.val();

      if (data) {
        console.log(data);

        return data;
      }
    });
  };

  return {
    app,
    auth,
    uploadToFirebaseStorage,
    createWhiteboard,
    listenToWhiteboardEvents,
    joinWhiteboard,
    updateWhiteboard,
    getWhiteboard,
  };
};
