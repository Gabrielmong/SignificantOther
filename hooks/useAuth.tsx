import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import {
  useAppDispatch,
  setUser,
  stateLogout,
  UserPayload,
  useAppSelector,
  updateUser,
  PartialUserPayload,
  RoomPayload,
  setRoom,
  updateRoom,
  resetRoom,
  store,
} from '../state';
import { useFirebase } from './useFirebase';
import { useAppToast } from './useAppToast';
import { FirebaseError } from '@firebase/util';
import { get, getDatabase, onValue, ref, update } from 'firebase/database';
import messaging from '@react-native-firebase/messaging';
import { useEffect } from 'react';
import { PermissionsAndroid } from 'react-native';
import { Linking } from 'react-native';
import {
  setLocationTaskUserInfo,
  clearLocationTaskUserInfo,
} from '../services/locationTask';
import { setWidgetTaskUserInfo, clearWidgetTaskUserInfo } from '../services/widgetTask';
import { clearAccentStorage } from '../services/accentStorage';
import { clearOnThisDay } from '../services/onThisDay';
import { Platform } from 'react-native';
import { BatteryOptEnabled, RequestDisableOptimization } from 'react-native-battery-optimization-check';

// Guards against re-registering messaging().onTokenRefresh() every time
// initialize() runs (it's called on every route change via EntryChecker,
// the same way auth.onAuthStateChanged is already re-registered there).
let tokenRefreshListenerRegistered = false;

// Guards against re-prompting for battery optimization exemption on every
// route change — ask at most once per app session.
let batteryOptimizationPrompted = false;

// Persists an FCM token for a user as a plain array — the one shape every
// call site (editExtraProfile, checkPermission, this) agrees on — deduping
// against whatever's already stored in both Firebase and Redux.
const persistFcmToken = async (
  db: ReturnType<typeof getDatabase>,
  dispatch: ReturnType<typeof useAppDispatch>,
  uid: string,
  fcmToken: string,
) => {
  const userDocRef = ref(db, `users/${uid}`);
  const snapshot = await get(userDocRef);
  const data = snapshot.val();
  const existingTokens: string[] = Array.isArray(data?.fcmtokens) ? data.fcmtokens : [];

  if (existingTokens.includes(fcmToken)) return;

  const fcmtokens = [...existingTokens, fcmToken];

  await update(userDocRef, { fcmtokens });
  dispatch(updateUser({ fcmtokens }));
};

export const useAuth = () => {
  const { auth } = useFirebase();
  const dispatch = useAppDispatch();
  const { showToast } = useAppToast();
  const user = useAppSelector((state) => state.user);
  const db = getDatabase();

  const checkToken = async () => {
    const permission = await messaging().hasPermission();

    const enabled =
      permission === messaging.AuthorizationStatus.AUTHORIZED ||
      permission === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      await messaging().requestPermission();
      requestUserPermission();
    }

    const fcmToken = await messaging().getToken();

    if (fcmToken && user?.uid) {
      dispatch(
        updateUser({
          thisDeviceToken: fcmToken,
        }),
      );

      await persistFcmToken(db, dispatch, user.uid, fcmToken);
    }
  };

  // Fires whenever the OS silently rotates the FCM token (independent of
  // checkToken, which only runs on auth-state/route changes) and persists
  // the new token the same way. Guarded so it's only registered once, even
  // though initialize() (which calls this) re-runs on every route change.
  const registerTokenRefreshListener = () => {
    if (tokenRefreshListenerRegistered) return;
    tokenRefreshListenerRegistered = true;

    messaging().onTokenRefresh(async (fcmToken) => {
      // This listener is registered once and lives for the app's lifetime,
      // so it must read the current uid fresh from the store rather than
      // close over whichever `user` was in scope at registration time.
      const currentUid = store.getState().user.uid;
      if (!currentUid) return;

      dispatch(updateUser({ thisDeviceToken: fcmToken }));
      await persistFcmToken(getDatabase(), dispatch, currentUid, fcmToken);
    });
  };

  // Asks the user to exempt the app from battery optimization, so background
  // work (widget updates, location tracking) stays reliable even when the
  // app has been closed for a while. Only meaningful on Android, and only
  // worth asking once per app session rather than on every route change.
  const requestBatteryOptimizationExemption = async () => {
    if (Platform.OS !== 'android' || batteryOptimizationPrompted) return;
    batteryOptimizationPrompted = true;

    const isRestricted = await BatteryOptEnabled();

    if (isRestricted) {
      showToast({
        title: 'One more thing',
        description:
          "To keep your partner's updates reliable, please allow this app to run without battery restrictions on the next screen.",
        status: 'info',
      });

      RequestDisableOptimization();
    }
  };

  const logout = (): Promise<void> => {
    if (!auth) return Promise.resolve();

    return auth.signOut().then(async () => {
      dispatch(stateLogout());
      dispatch(resetRoom());
      await clearLocationTaskUserInfo();
      await clearWidgetTaskUserInfo();
      await clearAccentStorage();
      await clearOnThisDay();

      showToast({
        title: 'Logout',
        description: 'You have been logged out',
        status: 'success',
      });
    });
  };

  const signIn = (email: string, password: string): Promise<boolean> => {
    if (!auth) return Promise.resolve(false);

    return signInWithEmailAndPassword(auth, email, password)
      .then(async (userCredential) => {
        await getExtraProfile();

        const userPayload: UserPayload = {
          displayName: userCredential.user?.displayName,
          email: userCredential.user?.email,
          uid: userCredential.user?.uid,
          photoURL: userCredential.user?.photoURL,
        };
        dispatch(setUser(userPayload));

        showToast({
          title: 'Sign in',
          description: 'Welcome back',
          status: 'success',
        });

        return true;
      })
      .catch((error: FirebaseError) => {
        const errorMessage = error.message;

        showToast({
          title: 'Sign in failed',
          description: errorMessage,
          status: 'error',
        });

        return false;
      });
  };

  const signUp = (email: string, password: string): Promise<boolean> => {
    if (!auth) return Promise.resolve(false);

    return createUserWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        const userPayload: UserPayload = {
          displayName: userCredential.user?.displayName,
          email: userCredential.user?.email,
          uid: userCredential.user?.uid,
          photoURL: userCredential.user?.photoURL,
        };

        dispatch(setUser(userPayload));

        // Create user entry in Firebase Realtime Database
        const userDocRef = ref(db, `users/${userCredential.user?.uid}`);
        update(userDocRef, {
          displayName: userCredential.user?.displayName || '',
          email: userCredential.user?.email || '',
          photoURL: userCredential.user?.photoURL || null,
        }).catch((error) => {
          console.error('Error creating user in database:', error);
        });

        showToast({
          title: 'Sign up success',
          description: `Welcome, ${userPayload?.email}`,
          status: 'success',
        });

        return true;
      })
      .catch((error: FirebaseError): boolean => {
        const errorMessage = error.message;

        showToast({
          title: 'Sign up failed',
          description: errorMessage,
          status: 'error',
        });

        return false;
      });
  };

  const initialize = () => {
    if (!auth) return;

    registerTokenRefreshListener();

    auth.onAuthStateChanged(async (user) => {
      if (user) {
        user?.getIdTokenResult().then((idTokenResult) => {});

        await getExtraProfile();

        await checkToken();
        await requestBatteryOptimizationExemption();

        const userPayload: UserPayload = {
          displayName: user.displayName,
          email: user.email,
          uid: user.uid,
          photoURL: user.photoURL,
        };

        dispatch(setUser(userPayload));
      } else {
        dispatch(stateLogout());
        dispatch(resetRoom());
      }
    });
  };

  const forgotPassword = (email: string): Promise<boolean> => {
    if (!auth) return Promise.resolve(false);

    return sendPasswordResetEmail(auth, email)
      .then(() => {
        showToast({
          title: 'Forgot password',
          description: 'Password reset email sent',
          status: 'success',
        });

        return true;
      })
      .catch((error: FirebaseError) => {
        const errorMessage = error.message;

        showToast({
          title: 'Forgot password failed',
          description: errorMessage,
          status: 'error',
        });

        return false;
      });
  };

  const editProfile = ({ displayName, photoURL }: { displayName?: string; photoURL?: string }) => {
    if (!auth?.currentUser) return;

    const updatedFields: PartialUserPayload = {};
    if (displayName && displayName !== user?.displayName) updatedFields.displayName = displayName;
    if (photoURL && photoURL !== user?.photoURL) updatedFields.photoURL = photoURL;

    updateProfile(auth.currentUser, updatedFields)
      .then(() => {
        dispatch(updateUser(updatedFields));

        // Also save to Firebase Realtime Database so partners can see the photo
        const userDocRef = ref(db, `users/${user?.uid}`);
        update(userDocRef, updatedFields).catch((error) => {
          console.error('Error updating user profile in database:', error);
        });

        showToast({
          title: 'Profile updated',
          description: 'Profile has been updated',
          status: 'success',
        });
      })
      .catch((error: FirebaseError) => {
        const errorMessage = error.message;

        showToast({
          title: 'Profile update failed',
          description: errorMessage,
          status: 'error',
        });
      });
  };

  const editExtraProfile = ({
    roomId,
    fcmToken,
    notifications,
  }: {
    roomId?: string;
    fcmToken?: string;
    notifications?: { checkin: [number, number] };
  }) => {
    if (!auth?.currentUser) return;

    const updatedFields: PartialUserPayload = {};
    if (roomId && roomId !== user?.roomId) updatedFields.roomId = roomId;
    if (fcmToken && !user?.fcmtokens?.includes(fcmToken)) {
      updatedFields.fcmtokens = user?.fcmtokens ? [...user.fcmtokens, fcmToken] : [fcmToken];
    }
    if (notifications) updatedFields.notifications = notifications;

    if (roomId) dispatch(updateRoom({ roomId }));

    const userDocRef = ref(db, `users/${user?.uid}`);

    update(userDocRef, updatedFields);

    dispatch(updateUser(updatedFields));
  };

  const getExtraProfile = () => {
    if (!auth?.currentUser) return;

    const userDocRef = ref(db, `users/${user?.uid}`);

    get(userDocRef).then((snapshot) => {
      const data = snapshot.val();

      if (data) {
        const updatedFields: PartialUserPayload = {
          roomId: data.roomId,
          fcmtokens: data.fcmtokens,
          notifications: data.notifications,
        };

        const roomDocRef = ref(db, `rooms/${data.roomId}`);

        get(roomDocRef).then((snapshot) => {
          const roomData = snapshot.val();

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
          }
        });
      }
    });
  };

  const requestUserPermission = async () => {
    PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  };

  const revokeUserPermission = async () => {
    messaging().unregisterDeviceForRemoteMessages();
  };

  const getPermission = async () => {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    return enabled;
  };

  const checkPermission = async () => {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      const fcmToken = await messaging().getToken();

      if (fcmToken) {
        if (!user?.fcmtokens?.includes(fcmToken)) {
          editExtraProfile({ fcmToken });
        }
      }
    }
  };

  return {
    editProfile,
    forgotPassword,
    initialize,
    logout,
    signIn,
    signUp,
    user,
    editExtraProfile,
    getExtraProfile,
    checkToken,
    requestUserPermission,
    checkPermission,
    revokeUserPermission,
    getPermission,
  };
};
