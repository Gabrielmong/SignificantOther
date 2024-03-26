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
} from '../state';
import { useFirebase } from './useFirebase';
import { useAppToast } from './useAppToast';
import { FirebaseError } from '@firebase/util';
import { get, getDatabase, onValue, ref, update } from 'firebase/database';
import messaging from '@react-native-firebase/messaging';
import { useEffect } from 'react';
import { PermissionsAndroid } from 'react-native';

export const useAuth = () => {
  const { auth } = useFirebase();
  const dispatch = useAppDispatch();
  const { showToast } = useAppToast();
  const user = useAppSelector((state) => state.user);
  const db = getDatabase();

  const checkToken = async () => {
    const fcmToken = await messaging().getToken();
    if (fcmToken) {
      dispatch(
        updateUser({
          thisDeviceToken: fcmToken,
        }),
      );
    }
  };

  const logout = (): Promise<void> => {
    if (!auth) return Promise.resolve();

    return auth.signOut().then(() => {
      dispatch(stateLogout());

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

    auth.onAuthStateChanged(async (user) => {
      if (user) {
        user?.getIdTokenResult().then((idTokenResult) => {});

        await getExtraProfile();

        await requestUserPermission();

        await checkToken();

        const userPayload: UserPayload = {
          displayName: user.displayName,
          email: user.email,
          uid: user.uid,
          photoURL: user.photoURL,
        };

        dispatch(setUser(userPayload));
      } else {
        dispatch(stateLogout());
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

  const editExtraProfile = ({ roomId, fcmToken }: { roomId?: string; fcmToken?: string }) => {
    if (!auth?.currentUser) return;

    const updatedFields: PartialUserPayload = {};
    if (roomId && roomId !== user?.roomId) updatedFields.roomId = roomId;
    if (fcmToken && !user?.fcmtokens?.includes(fcmToken)) {
      updatedFields.fcmtokens = user?.fcmtokens ? [...user.fcmtokens, fcmToken] : [fcmToken];
    }

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
          }
        });
      }
    });
  };

  const requestUserPermission = async () => {
    PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  };

  const checkPermission = async () => {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Authorization status:', authStatus);
      const fcmToken = await messaging().getToken();

      console.log('fcmToken:', fcmToken);

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
  };
};
