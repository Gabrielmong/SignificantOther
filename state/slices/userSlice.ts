import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import { User } from 'firebase/auth';

// Define a type for the slice state
interface UserState {
  displayName: string | null;
  email: string | null;
  loggedIn: boolean | undefined;
  uid?: string;
  photoURL?: string | null;
}

// Define the initial state using that type
const initialState: UserState = {
  displayName: 'John Doe',
  email: '',
  loggedIn: undefined,
  uid: '',
  photoURL: '',
};

export type UserPayload = Pick<User, 'displayName' | 'email' | 'uid' | 'photoURL'>;

export const UserSlice = createSlice({
  name: 'User',
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<UserPayload>) => {
      state.displayName = action.payload.displayName;
      state.email = action.payload.email;
      state.uid = action.payload.uid;
      state.photoURL = action.payload.photoURL;
      state.loggedIn = true;
    },
    stateLogout: (state) => {
      state.displayName = '';
      state.email = '';
      state.uid = '';
      state.photoURL = '';
      state.loggedIn = false;
    },
  },
});

export const { setUser, stateLogout } = UserSlice.actions;

// Other code such as selectors can use the imported `RootState` type
export const selectUser = (state: RootState) => state.user;

export const UserReducer = UserSlice.reducer;
