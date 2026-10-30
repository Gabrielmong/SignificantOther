import { getApp } from '@react-native-firebase/app';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { getDatabase, setPersistenceEnabled } from '@react-native-firebase/database';

// Firebase runs natively (React Native Firebase), configured from
// google-services.json, so there's nothing to initialize in JS.
//
// Keep a disk copy of the data this device has seen, so screens fill in from
// it on launch instead of waiting for the network. Native code reads this when
// the database is first used, so index.js loads this module before anything
// else, headless launches (widget, push, location task) included.
setPersistenceEnabled(getDatabase(), true);

export const ensureFirebaseApp = () => {
  const app = getApp();
  return { app, auth: getAuth(app) };
};

// Database rules require a signed-in user, so background reads must wait for
// the persisted session to be restored first. Returns false when signed out.
export const ensureSignedIn = async () => {
  const auth = getAuth();
  if (auth.currentUser) return true;

  // The first event reports the restored session (or none)
  await new Promise<void>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      unsubscribe();
      resolve();
    });
  });
  return !!auth.currentUser;
};
