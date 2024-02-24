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
} from '../state';
import { useFirebase } from './useFirebase';
import { useAppToast } from './useAppToast';
import { FirebaseError } from '@firebase/util';
import { router } from 'expo-router';
import { useEffect } from 'react';

export const useAuth = () => {
  const { auth } = useFirebase();
  const dispatch = useAppDispatch();
  const { showToast } = useAppToast();
  const user = useAppSelector((state) => state.user);

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
      .then((userCredential) => {
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

    auth.onAuthStateChanged((user) => {
      if (user) {
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

        router.back();
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

  return {
    editProfile,
    forgotPassword,
    initialize,
    logout,
    signIn,
    signUp,
    user,
  };
};
