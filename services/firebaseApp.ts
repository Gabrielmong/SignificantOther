import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseConfig } from '../config';

// Initializes the Firebase JS SDK once, wherever it's first needed. Background
// entry points (widget handler, location task) can run without the React tree
// ever mounting, so they can't rely on useFirebase() having done this.
export const ensureFirebaseApp = () => {
  if (getApps().length) {
    const app = getApp();
    return { app, auth: getAuth(app) };
  }

  const app = initializeApp(firebaseConfig);
  const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });

  return { app, auth };
};

// Database rules require a signed-in user, so background reads must wait for
// the persisted session to be restored first. Returns false when signed out.
export const ensureSignedIn = async () => {
  const { auth } = ensureFirebaseApp();
  await auth.authStateReady();
  return !!auth.currentUser;
};
