import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../store';

interface RoomState {
  roomId: string;
  partnerId: string;
  partnerName: string;
}

const initialState: RoomState = {
  roomId: '',
  partnerId: '',
  partnerName: '',
};

export type RoomPayload = Pick<RoomState, 'roomId' | 'partnerId' | 'partnerName'>;

export type PartialRoomPayload = Partial<RoomState>;

export const roomSlice = createSlice({
  name: 'room',
  initialState,
  reducers: {
    setRoom: (state, action: PayloadAction<RoomState>) => {
      state.roomId = action.payload.roomId;
      state.partnerId = action.payload.partnerId;
      state.partnerName = action.payload.partnerName;
    },
    updateRoom: (state, action: PayloadAction<PartialRoomPayload>) => {
      state.roomId = action.payload.roomId || state.roomId;
      state.partnerId = action.payload.partnerId || state.partnerId;
      state.partnerName = action.payload.partnerName || state.partnerName;
    },
    resetRoom: (state) => {
      state.roomId = '';
      state.partnerId = '';
      state.partnerName = '';
    },
  },
});

export const { setRoom, resetRoom, updateRoom } = roomSlice.actions;

export const selectRoomId = (state: RootState) => state.room.roomId;

export const RoomReducer = roomSlice.reducer;
