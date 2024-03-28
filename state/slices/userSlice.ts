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
  roomId?: string;
  fcmtokens?: string[];
  thisDeviceToken?: string;
  notifications?: {
    checkin?: [number, number];
  };
}

// Define the initial state using that type
const initialState: UserState = {
  displayName: 'John Doe',
  email: '',
  loggedIn: undefined,
  uid: '',
  photoURL: '',
  roomId: '',
  fcmtokens: [],
  thisDeviceToken: '',
  notifications: {
    checkin: [22, 0],
  },
};

export type UserPayload = Pick<
  UserState,
  | 'displayName'
  | 'email'
  | 'uid'
  | 'photoURL'
  | 'roomId'
  | 'fcmtokens'
  | 'thisDeviceToken'
  | 'notifications'
>;
export type PartialUserPayload = Partial<UserState>;

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
      state.roomId = action.payload.roomId || state.roomId;
      state.fcmtokens = action.payload.fcmtokens || state.fcmtokens;
      state.thisDeviceToken = action.payload.thisDeviceToken || state.thisDeviceToken;
      state.notifications = action.payload.notifications || state.notifications;
    },
    stateLogout: (state) => {
      state.displayName = '';
      state.email = '';
      state.uid = '';
      state.photoURL = '';
      state.loggedIn = false;
      state.roomId = '';
      state.fcmtokens = [];
      state.thisDeviceToken = '';
      state.notifications = { checkin: [22, 0] };
    },
    updateUser: (state, action: PayloadAction<PartialUserPayload>) => {
      state.displayName = action.payload?.displayName || state.displayName;
      state.email = action.payload?.email || state.email;
      state.photoURL = action.payload?.photoURL || state.photoURL;
      state.roomId = action.payload?.roomId || state.roomId;
      state.fcmtokens = action.payload?.fcmtokens || state.fcmtokens;
      state.thisDeviceToken = action.payload?.thisDeviceToken || state.thisDeviceToken;
      state.notifications = action.payload?.notifications || state.notifications;
    },
  },
});

export const { setUser, stateLogout, updateUser } = UserSlice.actions;

// Other code such as selectors can use the imported `RootState` type
export const selectUser = (state: RootState) => state.user;

export const UserReducer = UserSlice.reducer;
